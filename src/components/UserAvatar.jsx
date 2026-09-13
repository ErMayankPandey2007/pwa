import React from 'react';
import { HiUser } from 'react-icons/hi2';
import { useTenant } from '../context/TenantContext';
import { getMediaUrl } from '../utils/mediaUrl';

export default function UserAvatar({ 
  src, 
  name, 
  className = "w-10 h-10", 
  iconClassName = "w-5 h-5",
  roundedClassName = "rounded-full" 
}) {
  const { primaryColor, secondaryColor } = useTenant();
  const [imgError, setImgError] = React.useState(false);

  // If a valid custom photo url is provided (not the old static asset)
  const resolvedSrc = getMediaUrl(src);
  const hasValidPhoto = !imgError && resolvedSrc && typeof resolvedSrc === 'string' && resolvedSrc.trim() !== '' && !resolvedSrc.includes('profile_avatar.jpg');

  // Reset imgError if src changes
  React.useEffect(() => {
    setImgError(false);
  }, [src]);

  // Compute 1 or 2 letter initials from name
  const getInitials = (fullName) => {
    if (!fullName || typeof fullName !== 'string') return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  if (hasValidPhoto) {
    return (
      <div className={`${className} ${roundedClassName} overflow-hidden bg-transparent flex items-center justify-center shrink-0`}>
        <img 
          src={resolvedSrc} 
          alt={name || 'User Avatar'} 
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback Modern Dynamic Avatar with Initials or User Icon themed to Tenant (Solid color, no gradient)
  return (
    <div 
      className={`${className} ${roundedClassName} text-white flex items-center justify-center font-bold tracking-tight shadow-xs select-none shrink-0`}
      style={{
        backgroundColor: primaryColor || '#f37920'
      }}
    >
      {initials ? (
        <span className="text-xs sm:text-sm uppercase">{initials}</span>
      ) : (
        <HiUser className={`${iconClassName} text-white opacity-95`} />
      )}
    </div>
  );
}

