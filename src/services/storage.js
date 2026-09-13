// Storage Service for Vidyak PWA
// Manages local state safely without hardcoded mock seed data

const KEYS = {
  TOKEN: 'token',
  USER: 'pwa_user_profile',
  TENANT_SLUG: 'tenant_slug',
  COMPLAINTS: 'pwa_complaints',
  POLLS: 'pwa_polls',
  VOTED_POLLS: 'pwa_voted_polls_map',
  MEMBERSHIPS: 'pwa_memberships',
  VOLUNTEERS: 'pwa_volunteers',
  SAVED_POSTERS: 'pwa_saved_posters',
  SAVED_UPLOADS: 'pwa_saved_uploads',
};

export const storage = {
  // User Profile
  getUser: () => {
    try {
      const data = localStorage.getItem(KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setUser: (userData) => {
    if (userData) {
      localStorage.setItem(KEYS.USER, JSON.stringify(userData));
    } else {
      localStorage.removeItem(KEYS.USER);
    }
  },

  // Token Management
  getToken: () => {
    return localStorage.getItem(KEYS.TOKEN) || '';
  },

  setToken: (token) => {
    if (token) {
      localStorage.setItem(KEYS.TOKEN, token);
    } else {
      localStorage.removeItem(KEYS.TOKEN);
    }
  },

  // Tenant Slug
  getTenantSlug: () => {
    return localStorage.getItem(KEYS.TENANT_SLUG) || '';
  },

  setTenantSlug: (slug) => {
    if (slug) {
      localStorage.setItem(KEYS.TENANT_SLUG, slug);
    } else {
      localStorage.removeItem(KEYS.TENANT_SLUG);
    }
  },

  // Dynamic Complaints Local Store
  getComplaints: () => {
    try {
      const data = localStorage.getItem(KEYS.COMPLAINTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addComplaint: (newComplaint) => {
    const list = storage.getComplaints();
    const updated = [newComplaint, ...list];
    localStorage.setItem(KEYS.COMPLAINTS, JSON.stringify(updated));
    return updated;
  },

  // Persistent Poll Votes map ({ [pollId]: { optionId, optionIds } | optionId })
  getVotedPolls: () => {
    try {
      const data = localStorage.getItem(KEYS.VOTED_POLLS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  setVotedPoll: (pollId, voteData) => {
    const map = storage.getVotedPolls();
    map[String(pollId)] = voteData;
    localStorage.setItem(KEYS.VOTED_POLLS, JSON.stringify(map));
  },

  // Dynamic Polls Local Store
  getPolls: () => {
    try {
      const data = localStorage.getItem(KEYS.POLLS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  setPolls: (pollsList) => {
    localStorage.setItem(KEYS.POLLS, JSON.stringify(pollsList || []));
  },

  votePoll: (pollId, voteData) => {
    const selectedIds = Array.isArray(voteData)
      ? voteData
      : (Array.isArray(voteData?.optionIds)
          ? voteData.optionIds
          : (voteData?.optionId ? [voteData.optionId] : [voteData]));
    
    storage.setVotedPoll(pollId, {
      optionId: selectedIds[0] || null,
      optionIds: selectedIds,
    });

    const polls = storage.getPolls();
    const updated = polls.map((poll) => {
      const pId = poll._id || poll.id;
      if (String(pId) === String(pollId)) {
        const total = (poll.totalVotes || 0) + 1;
        const options = (poll.options || []).map((opt) => {
          const optId = String(opt._id || opt.id || opt.optionId);
          const isVoted = selectedIds.includes(optId);
          const votes = isVoted ? (opt.votes || 0) + 1 : (opt.votes || 0);
          return {
            ...opt,
            votes,
            percentage: total > 0 ? Math.round((votes / total) * 100) : 0,
            percent: total > 0 ? Math.round((votes / total) * 100) : 0
          };
        });
        return {
          ...poll,
          totalVotes: total,
          userVoted: selectedIds[0] || null,
          userVotedIds: selectedIds,
          isVoted: true,
          hasVoted: true,
          options
        };
      }
      return poll;
    });
    localStorage.setItem(KEYS.POLLS, JSON.stringify(updated));
    return updated;
  },

  // Dynamic Memberships Store
  getMemberships: () => {
    try {
      const data = localStorage.getItem(KEYS.MEMBERSHIPS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addMembership: (item) => {
    const list = storage.getMemberships();
    const updated = [item, ...list];
    localStorage.setItem(KEYS.MEMBERSHIPS, JSON.stringify(updated));
    return updated;
  },

  // Dynamic Volunteers Store
  getVolunteers: () => {
    try {
      const data = localStorage.getItem(KEYS.VOLUNTEERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addVolunteer: (vol) => {
    const list = storage.getVolunteers();
    const updated = [vol, ...list];
    localStorage.setItem(KEYS.VOLUNTEERS, JSON.stringify(updated));
    return updated;
  },

  // 🌟 Canva-Style "My Posters" Saved Store (Unlimited Multi-Save Support)
  getSavedPosters: () => {
    try {
      const data = localStorage.getItem(KEYS.SAVED_POSTERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  savePoster: (posterData) => {
    try {
      const list = storage.getSavedPosters();
      // Generate a new unique ID if not explicitly specified
      const id = posterData.id || `poster-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const existingIdx = list.findIndex(p => p.id === id);
      let updated;
      if (existingIdx >= 0) {
        updated = [...list];
        updated[existingIdx] = { ...posterData, id, updatedAt: new Date().toISOString() };
      } else {
        updated = [{ ...posterData, id, createdAt: new Date().toISOString() }, ...list];
      }
      try {
        localStorage.setItem(KEYS.SAVED_POSTERS, JSON.stringify(updated));
      } catch (quotaErr) {
        // Fallback: if storage quota is full, compress list without heavy thumbnails
        const compacted = updated.map(p => ({
          ...p,
          thumbnail: p.bgImage || null
        })).slice(0, 20);
        localStorage.setItem(KEYS.SAVED_POSTERS, JSON.stringify(compacted));
      }
      return updated;
    } catch (e) {
      console.error('Error saving poster:', e);
      return storage.getSavedPosters();
    }
  },

  deleteSavedPoster: (id) => {
    try {
      const list = storage.getSavedPosters();
      const updated = list.filter(p => p.id !== id);
      localStorage.setItem(KEYS.SAVED_POSTERS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      return [];
    }
  },

  // 🌟 Canva-Style "Uploads" Reusable Photo Gallery Store
  getSavedUploads: () => {
    try {
      const data = localStorage.getItem(KEYS.SAVED_UPLOADS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addSavedUpload: (uploadItem) => {
    try {
      const list = storage.getSavedUploads();
      const id = uploadItem.id || `upload-${Date.now()}`;
      // Prevent duplicate URLs/src
      const filtered = list.filter(u => u.src !== uploadItem.src && u.id !== id);
      let updated = [{ ...uploadItem, id, createdAt: new Date().toISOString() }, ...filtered];
      // Limit to 40 uploaded items
      if (updated.length > 40) {
        updated = updated.slice(0, 40);
      }
      localStorage.setItem(KEYS.SAVED_UPLOADS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error saving upload:', e);
      return storage.getSavedUploads();
    }
  },

  deleteSavedUpload: (id) => {
    try {
      const list = storage.getSavedUploads();
      const updated = list.filter(u => u.id !== id);
      localStorage.setItem(KEYS.SAVED_UPLOADS, JSON.stringify(updated));
      return updated;
    } catch (e) {
      return [];
    }
  },

  // Clear auth session data on logout (keeps persistent device votes & posters intact)
  clear: () => {
    localStorage.removeItem(KEYS.USER);
    localStorage.removeItem(KEYS.TOKEN);
    localStorage.removeItem(KEYS.COMPLAINTS);
    localStorage.removeItem(KEYS.MEMBERSHIPS);
    localStorage.removeItem(KEYS.VOLUNTEERS);
  }
};
