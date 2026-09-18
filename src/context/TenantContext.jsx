import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { getMediaUrl } from '../utils/mediaUrl';

const currentSlug = api.getTenantSlug();
const CACHE_KEY = currentSlug ? `pwa_cached_tenant_config_${currentSlug}` : 'pwa_cached_tenant_config_default';

// Helper to get cached config synchronously before first paint
const getInitialConfig = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const DEFAULT_GERUA = '#EA580C';
const DEFAULT_BLACK = '#111827';

const DUMMY_DEFAULT_CONFIG = {
  tenant: {
    name: '',
    slug: '',
    constituency: '',
    state: '',
  },
  branding: {
    appName: '',
    leaderName: '',
    tagline: '',
    primaryColor: DEFAULT_GERUA,
    secondaryColor: DEFAULT_BLACK,
    logoUrl: '',
    heroBannerUrl: '',
  }
};

const initialConfig = currentSlug ? getInitialConfig() : DUMMY_DEFAULT_CONFIG;
const initialPrimary = currentSlug ? (initialConfig?.branding?.primaryColor || DEFAULT_GERUA) : DEFAULT_GERUA;
const initialSecondary = currentSlug ? (initialConfig?.branding?.secondaryColor || DEFAULT_BLACK) : DEFAULT_BLACK;
const rawInitialLogo = initialConfig?.branding?.logoUrl || initialConfig?.branding?.logo || initialConfig?.branding?.faviconUrl;
const initialFavicon = rawInitialLogo ? getMediaUrl(rawInitialLogo) : null;

const resolveTenantTitle = (config) => {
  if (!config) return 'जनसेवा - Janseva';
  const branding = config.branding || {};
  const tenant = config.tenant || {};
  
  if (branding.appName && branding.leaderName) {
    return `${branding.appName} - ${branding.leaderName}`;
  }
  if (branding.appName) {
    return branding.appName;
  }
  if (branding.title) {
    return branding.title;
  }
  if (branding.leaderName) {
    return `${branding.leaderName} | ${tenant.name || tenant.constituency || 'जनसेवा'}`;
  }
  if (tenant.name) {
    return `${tenant.name} - जनसेवा`;
  }
  return 'जनसेवा - Janseva';
};

// Immediately set variables & favicon & title before React mounts
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--color-primary', initialPrimary);
  document.documentElement.style.setProperty('--color-secondary', initialSecondary);
  document.documentElement.style.setProperty('--primary-color', initialPrimary);
  document.documentElement.style.setProperty('--secondary-color', initialSecondary);

  document.title = resolveTenantTitle(initialConfig);

  if (initialFavicon) {
    const icons = document.querySelectorAll("link[rel*='icon']");
    icons.forEach(el => {
      el.href = initialFavicon;
      el.type = 'image/png';
    });
  }
}

const TenantContext = createContext({
  tenant: initialConfig?.tenant || DUMMY_DEFAULT_CONFIG.tenant,
  branding: initialConfig?.branding || DUMMY_DEFAULT_CONFIG.branding,
  primaryColor: initialPrimary,
  secondaryColor: initialSecondary,
  leaderName: initialConfig?.branding?.leaderName || 'जनप्रतिनिधि',
  tagline: initialConfig?.branding?.tagline || 'सेवा, संकल्प और विकास ही हमारी पहचान',
  logoUrl: initialConfig?.branding?.logoUrl || '/image copy 3.png',
  isLoading: false,
});

export const TenantProvider = ({ children }) => {
  const [tenantConfig, setTenantConfig] = useState(initialConfig);
  const [isLoading, setIsLoading] = useState(currentSlug ? !initialConfig : false);

  useEffect(() => {
    // If no tenant slug is provided in env, DO NOT fetch any backend tenant data.
    // Use the dummy default branding (Gerua + Black)
    if (!currentSlug) {
      setTenantConfig(DUMMY_DEFAULT_CONFIG);
      setIsLoading(false);
      document.documentElement.style.setProperty('--color-primary', DEFAULT_GERUA);
      document.documentElement.style.setProperty('--color-secondary', DEFAULT_BLACK);
      document.documentElement.style.setProperty('--primary-color', DEFAULT_GERUA);
      document.documentElement.style.setProperty('--secondary-color', DEFAULT_BLACK);
      return;
    }

    const fetchConfig = async () => {
      try {
        const config = await api.getConfig();
        if (config) {
          setTenantConfig(config);
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(config));
          } catch (e) {
            console.warn('Could not cache tenant config:', e);
          }
          
          const brandingData = config.branding || {};
          const primary = brandingData.primaryColor || DEFAULT_GERUA;
          const secondary = brandingData.secondaryColor || DEFAULT_BLACK;
          const rawFavicon = brandingData.logoUrl || brandingData.logo || brandingData.faviconUrl || null;
          const favicon = rawFavicon ? getMediaUrl(rawFavicon) : null;
          const leader = brandingData.leaderName || config.tenant?.name || config.name || 'जनसेवा';

          // Inject CSS variables globally to the root document
          document.documentElement.style.setProperty('--color-primary', primary);
          document.documentElement.style.setProperty('--color-secondary', secondary);
          document.documentElement.style.setProperty('--primary-color', primary);
          document.documentElement.style.setProperty('--secondary-color', secondary);

          // Dynamic title based on backend tenant branding / slug
          document.title = resolveTenantTitle(config);

          // Dynamically update favicon directly on all icon link tags
          const updateFavicon = (url) => {
            if (!url) return;
            const isDataUri = url.startsWith('data:');
            const fullUrl = isDataUri ? url : (url.includes('?') ? `${url}&v=${Date.now()}` : `${url}?v=${Date.now()}`);
            
            const existingIcons = document.querySelectorAll("link[rel*='icon']");
            if (existingIcons.length > 0) {
              existingIcons.forEach(el => {
                el.href = fullUrl;
                el.type = isDataUri ? (url.split(';')[0].replace('data:', '') || 'image/png') : 'image/png';
              });
            } else {
              const faviconEl = document.createElement('link');
              faviconEl.id = 'app-favicon';
              faviconEl.rel = 'icon';
              faviconEl.type = 'image/png';
              faviconEl.href = fullUrl;
              document.head.appendChild(faviconEl);
            }

            // Also update or add apple-touch-icon
            let appleEl = document.querySelector("link[rel='apple-touch-icon']");
            if (!appleEl) {
              appleEl = document.createElement('link');
              appleEl.rel = 'apple-touch-icon';
              document.head.appendChild(appleEl);
            }
            appleEl.href = fullUrl;
          };

          // Dynamically update PWA manifest so installed app gets tenant icon & name
          const updateDynamicManifest = (tenantData, branding) => {
            const appName = branding.appName || branding.title || tenantData.name || 'Portal';
            const shortName = branding.appName || tenantData.name || 'Portal';
            const iconUrl = rawFavicon ? getMediaUrl(rawFavicon) : '';
            const themeColor = branding.primaryColor || DEFAULT_GERUA;

            const manifestData = {
              id: "/",
              short_name: shortName,
              name: appName,
              icons: iconUrl ? [
                {
                  src: iconUrl,
                  type: "image/png",
                  sizes: "192x192",
                  purpose: "any"
                },
                {
                  src: iconUrl,
                  type: "image/png",
                  sizes: "512x512",
                  purpose: "any"
                },
                {
                  src: iconUrl,
                  type: "image/png",
                  sizes: "192x192",
                  purpose: "maskable"
                },
                {
                  src: iconUrl,
                  type: "image/png",
                  sizes: "512x512",
                  purpose: "maskable"
                }
              ] : [],
              start_url: "/",
              scope: "/",
              background_color: "#ffffff",
              theme_color: themeColor,
              display: "standalone",
              orientation: "portrait"
            };

            const manifestBlob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
            const manifestObjectUrl = URL.createObjectURL(manifestBlob);

            let manifestEl = document.getElementById('app-manifest');
            if (manifestEl) {
              manifestEl.setAttribute('href', manifestObjectUrl);
            }
          };

          updateFavicon(favicon);
          updateDynamicManifest(config.tenant || {}, brandingData);
        }
      } catch (err) {
        console.warn('Failed to load global tenant configuration:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const branding = tenantConfig?.branding || (currentSlug ? {} : DUMMY_DEFAULT_CONFIG.branding);
  const tenant = tenantConfig?.tenant || (currentSlug ? {} : DUMMY_DEFAULT_CONFIG.tenant);
  const primaryColor = branding?.primaryColor || DEFAULT_GERUA;
  const secondaryColor = branding?.secondaryColor || DEFAULT_BLACK;
  const leaderName = branding?.leaderName || tenant?.name || '';
  const tagline = branding?.tagline || '';
  const rawLogo = branding?.logoUrl || branding?.logo || '';
  const logoUrl = rawLogo ? getMediaUrl(rawLogo) : '';

  return (
    <TenantContext.Provider
      value={{
        tenantConfig,
        tenant,
        branding,
        primaryColor,
        secondaryColor,
        leaderName,
        tagline,
        logoUrl,
        isLoading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
