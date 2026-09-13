// Dynamically detect host
const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  return 'https://election.digicoders.in';
};

const BASE_URL = getBaseUrl();
const DEFAULT_TENANT_SLUG = import.meta.env.VITE_DEFAULT_TENANT_SLUG || 'demo';

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  getToken() {
    return localStorage.getItem('token') || '';
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getTenantSlug() {
    const slug = (import.meta.env.VITE_DEFAULT_TENANT_SLUG || '').trim();
    return slug;
  }

  getHeaders(customHeaders = {}, isFormData = false) {
    const headers = {
      ...customHeaders,
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Tenant slug header
    const tenantSlug = this.getTenantSlug();
    if (tenantSlug) {
      headers['x-tenant-slug'] = tenantSlug;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const tenantSlug = this.getTenantSlug();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const separator = cleanEndpoint.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${cleanEndpoint}${tenantSlug ? `${separator}tenant_slug=${encodeURIComponent(tenantSlug)}` : ''}`;
    const isFormData = options.body instanceof FormData;
    const headers = this.getHeaders(options.headers, isFormData);

    const config = {
      ...options,
      headers,
    };

    if (options.body && typeof options.body === 'object' && !isFormData) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const resData = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.setToken(null);
        }
        const errorMsg = resData.message || (Array.isArray(resData.errors) ? resData.errors.join(', ') : 'Something went wrong');
        throw new Error(errorMsg);
      }

      // Backend returns { success: true, data: ... } via ResponseInterceptor
      return resData.data !== undefined ? resData.data : resData;
    } catch (error) {
      // Only log if not a standard 401, network error, or handled fallback route
      if (error?.message !== 'Unauthorized' && !endpoint.includes('my-going')) {
        console.error(`API Error [${endpoint}]:`, error);
      }
      throw error;
    }
  }

  // Auth APIs
  sendOtp(mobile) {
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: { mobile },
    });
  }

  verifyOtp(mobile, code) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: { mobile, code },
    });
  }

  // User / Citizen Profile APIs
  getCitizenProfile() {
    return this.request('/citizen/profile', {
      method: 'GET',
    });
  }

  updateCitizenProfile(profileData) {
    return this.request('/citizen/profile', {
      method: 'PATCH',
      body: profileData,
    });
  }

  uploadFile(file, module = 'citizens') {
    const formData = new FormData();
    formData.append('files', file);
    return this.request(`/uploads/${module}`, {
      method: 'POST',
      body: formData,
    });
  }

  getUserById(userId) {
    return this.request(`/users/${userId}`, {
      method: 'GET',
    });
  }

  updateProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PATCH',
      body: profileData,
    });
  }

  // Registration Form Dynamic APIs
  getPublicRegistrationForm() {
    return this.request('/registration-form/public', {
      method: 'GET',
    });
  }

  completeProfile(formData) {
    return this.request('/registration-form/complete-profile', {
      method: 'POST',
      body: formData,
    });
  }

  // Membership APIs
  getMyMembership() {
    return this.request('/membership/my', {
      method: 'GET',
    });
  }

  getMyMembershipCard() {
    return this.request('/membership/my/card', {
      method: 'GET',
    });
  }

  applyMembership(data) {
    return this.request('/membership/apply', {
      method: 'POST',
      body: data,
    });
  }

  // Polls APIs
  getActivePolls(params = {}) {
    let endpoint = '/polls';
    const query = new URLSearchParams();
    if (typeof params === 'string') {
      query.append('areaId', params);
    } else if (typeof params === 'object' && params !== null) {
      if (params.areaId) query.append('areaId', params.areaId);
      if (params.status) query.append('status', params.status);
      if (params.category) query.append('category', params.category);
    }
    const qs = query.toString();
    if (qs) endpoint += `?${qs}`;
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  getSinglePoll(pollId) {
    return this.request(`/polls/${pollId}`, {
      method: 'GET',
    });
  }

  votePoll(pollId, voteData) {
    // Support either single optionId string or { optionId } / { optionIds }
    const body = typeof voteData === 'object' && voteData !== null
      ? voteData
      : { optionId: voteData };
    return this.request(`/polls/${pollId}/vote`, {
      method: 'POST',
      body,
    });
  }

  getMyPollVote(pollId) {
    return this.request(`/polls/${pollId}/my-vote`, {
      method: 'GET',
    });
  }

  // Public Config & Bootstrap (White-Label Config)
  getConfig() {
    return this.request('/config', {
      method: 'GET',
    });
  }

  getPublicConfig() {
    return this.request('/config', {
      method: 'GET',
    });
  }

  // About Leader & Public Profile
  getAboutLeader() {
    return this.request('/about-leader', {
      method: 'GET',
    });
  }

  getAreaTree() {
    return this.request('/areas/tree', {
      method: 'GET',
    });
  }

  getAreaLevels() {
    return this.request('/areas/levels', {
      method: 'GET',
    });
  }

  getAreasByLevel(levelId) {
    return this.request(`/areas/by-level/${levelId}`, {
      method: 'GET',
    });
  }

  getAreaChildren(areaId) {
    return this.request(`/areas/${areaId}/children`, {
      method: 'GET',
    });
  }

  // Banners & Promotional Slides (Dynamic Home Slider)
  getBanners() {
    return this.request('/banners', {
      method: 'GET',
    });
  }

  // About Leader Profile
  getAboutLeader() {
    return this.request('/about-leader', {
      method: 'GET',
    });
  }

  // Development Works / Vikas Karya
  getWorks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/works${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  }

  getWorkById(id) {
    return this.request(`/works/${id}`, {
      method: 'GET',
    });
  }

  // File / Media Uploads
  uploadFiles(module = 'complaints', files = []) {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach((file) => formData.append('files', file));
    } else if (files) {
      formData.append('files', files);
    }
    return this.request(`/uploads/${module}`, {
      method: 'POST',
      body: formData,
    });
  }

  // Complaints / Jan Samasya
  getComplaintCategories() {
    return this.request('/complaints/categories', {
      method: 'GET',
    });
  }

  createComplaint(data) {
    return this.request('/complaints', {
      method: 'POST',
      body: data,
    });
  }

  getMyComplaints(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/complaints/my${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  }

  getPublicComplaints(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/complaints/public${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  }

  getMyComplaintStats() {
    return this.request('/complaints/my/stats', {
      method: 'GET',
    });
  }

  getComplaintById(id) {
    return this.request(`/complaints/${id}`, {
      method: 'GET',
    });
  }

  // Events & Rallies
  getEvents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/events${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  }

  getEventById(id) {
    return this.request(`/events/${id}`, {
      method: 'GET',
    });
  }

  async getMyGoingEvents() {
    try {
      const allRes = await this.getEvents({ limit: 100 }).catch(() => []);
      const eventsList = Array.isArray(allRes) ? allRes : (allRes?.data || allRes?.items || []);
      
      const rsvpChecks = await Promise.allSettled(
        eventsList.map(async (ev) => {
          const evId = ev._id || ev.id;
          if (!evId) return null;
          const rsvp = await this.getEventRsvp(evId).catch(() => null);
          if (rsvp && (rsvp.status === 'going' || rsvp === 'going' || rsvp?.isGoing || rsvp?.status === 'Going')) {
            return ev;
          }
          return null;
        })
      );

      return rsvpChecks
        .filter((r) => r.status === 'fulfilled' && r.value !== null)
        .map((r) => r.value);
    } catch {
      return [];
    }
  }

  getEventRsvp(id) {
    return this.request(`/events/${id}/my-rsvp`, {
      method: 'GET',
    });
  }

  getEventTicket(id) {
    return this.request(`/events/${id}/ticket`, {
      method: 'GET',
    });
  }

  rsvpEvent(id, status) {
    return this.request(`/events/${id}/rsvp`, {
      method: 'POST',
      body: { status },
    });
  }

  removeRsvpEvent(id) {
    return this.request(`/events/${id}/rsvp`, {
      method: 'DELETE',
    });
  }

  // Notifications (Tenant scoped & User scoped)
  getMyNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/notifications/my${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  }

  getNotificationUnreadCount() {
    return this.request('/notifications/unread-count', {
      method: 'GET',
    });
  }

  markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  // News / Blogs / Updates
  getNews(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/news${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  }

  getNewsById(id) {
    return this.request(`/news/${id}`, {
      method: 'GET',
    });
  }

  getNewsCategories() {
    return this.request('/news/categories', {
      method: 'GET',
    });
  }

  // Manifesto & Vision
  getManifesto(category) {
    const endpoint = category ? `/manifesto?category=${encodeURIComponent(category)}` : '/manifesto';
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  getManifestoCategories() {
    return this.request('/manifesto/categories', {
      method: 'GET',
    });
  }

  // Photo & Video Gallery
  getGallery(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/gallery${query ? `?${query}` : ''}`, {
      method: 'GET',
    });
  }

  // Volunteers Management
  applyVolunteer(data) {
    return this.request('/volunteers', {
      method: 'POST',
      body: data,
    });
  }

  getMyVolunteerProfile() {
    return this.request('/volunteers/my', {
      method: 'GET',
    });
  }

  // Festival Poster Generator
  getPosterTemplates(category) {
    const endpoint = category && category !== 'All' ? `/poster-generator/templates?category=${encodeURIComponent(category)}` : '/poster-generator/templates';
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  getPosterCategories() {
    return this.request('/poster-generator/templates/categories', {
      method: 'GET',
    });
  }

  generatePoster(templateId, formData) {
    return this.request(`/poster-generator/generate/${templateId}`, {
      method: 'POST',
      body: formData,
    });
  }

  getMyGeneratedPosters() {
    return this.request('/poster-generator/my-posters', {
      method: 'GET',
    });
  }

  // Firebase Cloud Messaging (FCM) Push Notifications
  registerFcmToken(token) {
    return this.request('/notifications/register-token', {
      method: 'POST',
      body: { token },
    });
  }

  testFcmPush(token) {
    return this.request('/notifications/test-push', {
      method: 'POST',
      body: token ? { token } : {},
    });
  }
}

export const api = new ApiClient();

