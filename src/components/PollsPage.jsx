import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'react-toastify';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useTenant } from '../context/TenantContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  HiMapPin, 
  HiCheck, 
  HiChartBar, 
  HiUsers, 
  HiArrowLeft,
  HiClock,
  HiLockClosed,
  HiCheckCircle,
  HiInformationCircle
} from 'react-icons/hi2';

export default function PollsPage() {
  const navigate = useNavigate();
  const { primaryColor, secondaryColor } = useTenant();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('Active'); // 'Active' | 'Past'
  const [pollData, setPollData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track selected options per poll before submission: { [pollId]: [optionId1, optionId2, ...] }
  const [selections, setSelections] = useState({});
  const [submittingPollId, setSubmittingPollId] = useState(null);

  const loadPolls = async () => {
    try {
      setIsLoading(true);
      const liveRes = await api.getActivePolls().catch(() => null);
      const storedPolls = storage.getPolls();
      const votedMap = storage.getVotedPolls();
      
      const livePolls = Array.isArray(liveRes)
        ? liveRes
        : (Array.isArray(liveRes?.items)
            ? liveRes.items
            : (Array.isArray(liveRes?.data?.items)
                ? liveRes.data.items
                : (Array.isArray(liveRes?.data) ? liveRes.data : [])));

      if (Array.isArray(livePolls) && livePolls.length > 0) {
        // Merge with local voted cache if citizen already voted
        const merged = livePolls.map(live => {
          const pId = String(live._id || live.id);
          const cachedVote = votedMap[pId];
          const cachedOptionIds = Array.isArray(cachedVote?.optionIds)
            ? cachedVote.optionIds
            : (cachedVote?.optionId ? [cachedVote.optionId] : (typeof cachedVote === 'string' ? [cachedVote] : []));

          const userVotedIds = (live.myOptionIds && live.myOptionIds.length > 0)
            ? live.myOptionIds
            : (live.myOptionId ? [live.myOptionId] : cachedOptionIds);

          const hasVoted = live.hasVoted || userVotedIds.length > 0;

          return { 
            ...live, 
            userVoted: userVotedIds[0] || null,
            userVotedIds: userVotedIds,
            isVoted: hasVoted,
            hasVoted: hasVoted,
            // If backend masks results, canViewResults will be false
            canViewResults: live.canViewResults ?? (hasVoted && live.resultStatus !== 'SCHEDULED' && live.resultVisibility !== 'SCHEDULED_DATE')
          };
        });
        setPollData(merged);
        storage.setPolls(merged);
      } else {
        // Fallback to locally stored polls
        const fallback = storedPolls.map(p => {
          const pId = String(p._id || p.id);
          const cachedVote = votedMap[pId];
          const cachedOptionIds = Array.isArray(cachedVote?.optionIds)
            ? cachedVote.optionIds
            : (cachedVote?.optionId ? [cachedVote.optionId] : (typeof cachedVote === 'string' ? [cachedVote] : []));

          if (cachedOptionIds.length > 0) {
            return {
              ...p,
              userVoted: cachedOptionIds[0],
              userVotedIds: cachedOptionIds,
              isVoted: true,
              hasVoted: true
            };
          }
          return p;
        });
        setPollData(fallback);
      }
    } catch (err) {
      console.warn('Error fetching polls:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();
  }, []);

  // Format countdown / duration helper
  const getRemainingTimeText = (poll) => {
    if (poll.isOpenForVoting === false || poll.isEnded) {
      return 'Voting Closed';
    }
    if (!poll.endsAt) {
      return 'Ongoing';
    }
    const end = new Date(poll.endsAt);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();
    if (diffMs <= 0) {
      return 'Voting Closed';
    }
    const diffHours = Math.floor(diffMs / (3600 * 1000));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 1) {
      return `${diffDays} days left`;
    }
    if (diffHours > 0) {
      return `${diffHours} hrs left`;
    }
    const diffMins = Math.floor(diffMs / (60 * 1000));
    return `${Math.max(1, diffMins)} mins left`;
  };

  // Format scheduled declaration date
  const formatScheduledDate = (dateStr) => {
    if (!dateStr) return 'Scheduled Date';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(dateStr);
    }
  };

  // Toggle selection for single or multi-choice
  const handleToggleOption = (poll, optId) => {
    const pId = String(poll._id || poll.id);
    const hasVoted = poll.hasVoted || poll.isVoted;
    
    // If already voted and revote is not allowed, do nothing
    if (hasVoted && !poll.allowRevote) {
      return;
    }

    if (poll.isOpenForVoting === false || poll.isEnded) {
      toast.info('Yeh poll close ho chuka hai.');
      return;
    }

    const current = selections[pId] || [];
    const isMulti = Boolean(poll.allowMultipleChoices);
    const max = isMulti ? (poll.maxChoices || poll.options.length) : 1;

    if (!isMulti) {
      // Single choice toggle
      setSelections(prev => ({
        ...prev,
        [pId]: [optId]
      }));
    } else {
      // Multi choice toggle
      if (current.includes(optId)) {
        setSelections(prev => ({
          ...prev,
          [pId]: current.filter(id => id !== optId)
        }));
      } else {
        if (current.length >= max) {
          toast.warn(`Aap adhik-se-adhik ${max} vikalp chun sakte hain.`);
          return;
        }
        setSelections(prev => ({
          ...prev,
          [pId]: [...current, optId]
        }));
      }
    }
  };

  // Submit Vote
  const handleSubmitVote = async (poll) => {
    const token = storage.getToken();
    if (!token) {
      toast.warn('Poll me vote dene ke liye pehle Login karein');
      navigate('/login', { state: { from: '/polls' } });
      return;
    }

    const pId = String(poll._id || poll.id);
    const selected = selections[pId] || [];

    if (selected.length === 0) {
      toast.warn(poll.allowMultipleChoices ? 'Kripya kam se kam 1 vikalp chunein' : 'Kripya apna vikalp chunein');
      return;
    }

    setSubmittingPollId(pId);

    try {
      let votePayload;
      if (poll.allowMultipleChoices) {
        votePayload = { optionIds: selected };
      } else {
        votePayload = { optionId: selected[0] };
      }

      const res = await api.votePoll(pId, votePayload);
      const successMsg = res?.message || 'Aapka vote safaltapoorvak darj kar liya gaya!';
      toast.success(successMsg);

      // Persist in local storage
      storage.votePoll(pId, selected);

      // Re-fetch fresh poll state from server to get updated percentages or secrecy status
      const updatedRes = await api.getSinglePoll(pId).catch(() => null);
      if (updatedRes) {
        const uPoll = updatedRes.data || updatedRes;
        setPollData(prev => prev.map(p => String(p._id || p.id) === pId ? {
          ...uPoll,
          hasVoted: true,
          isVoted: true,
          userVoted: selected[0],
          userVotedIds: selected,
        } : p));
      } else {
        // Fallback optimistic update
        setPollData(prev => prev.map(p => {
          if (String(p._id || p.id) === pId) {
            return {
              ...p,
              hasVoted: true,
              isVoted: true,
              userVoted: selected[0],
              userVotedIds: selected,
              canViewResults: p.resultVisibility !== 'SCHEDULED_DATE' && p.resultStatus !== 'SCHEDULED'
            };
          }
          return p;
        }));
      }

      // Clear pending selections for this poll
      setSelections(prev => {
        const next = { ...prev };
        delete next[pId];
        return next;
      });

    } catch (err) {
      console.warn('Vote submission error:', err);
      const errMsg = err?.message || '';
      if (errMsg.toLowerCase().includes('already voted') || err?.status === 400) {
        toast.info(errMsg || 'Aap pehle hi is poll me vote de chuke hain!');
        storage.votePoll(pId, selected);
        setPollData(prev => prev.map(p => String(p._id || p.id) === pId ? {
          ...p,
          hasVoted: true,
          isVoted: true,
          userVoted: selected[0],
          userVotedIds: selected,
        } : p));
      } else {
        toast.error(errMsg || 'Vote darj karne me truti hui. Dobara koshish karein.');
      }
    } finally {
      setSubmittingPollId(null);
    }
  };

  // Filter active vs past polls dynamically
  const now = new Date();
  const activePolls = pollData.filter(p => {
    const isEnded = (p.isOpenForVoting === false) || (p.endsAt && new Date(p.endsAt) < now) || (p.isEnded === true);
    const isExplicitlyInactive = p.isActive === false;
    return !isEnded && !isExplicitlyInactive;
  });

  const pastPolls = pollData.filter(p => {
    const isEnded = (p.isOpenForVoting === false) || (p.endsAt && new Date(p.endsAt) < now) || (p.isEnded === true);
    const isExplicitlyInactive = p.isActive === false;
    return isEnded || isExplicitlyInactive;
  });

  return (
    <div className="relative w-full h-screen flex flex-col bg-[#f8fafc] overflow-hidden pb-[72px]">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white border-b border-gray-100 shadow-xs z-20">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button 
            onClick={() => navigate(-1)} 
            className="w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all shrink-0"
          >
            <HiArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-gray-900 truncate leading-tight">
              {t('publicOpinionPolls')}
            </h1>
            <p className="text-[11px] font-semibold text-gray-500 truncate">
              {t('pollsTagline')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white px-4 border-b border-gray-100 shrink-0 shadow-xs z-10">
        <button 
          onClick={() => setActiveTab('Active')}
          className={`flex-1 py-3 text-xs font-black border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === 'Active' ? 'border-b-2' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
          style={activeTab === 'Active' ? { borderColor: primaryColor, color: primaryColor } : {}}
        >
          <span>{t('activePollsTab')}</span>
          <span 
            className="px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            {activePolls.length}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('Past')}
          className={`flex-1 py-3 text-xs font-black border-b-2 transition-all flex items-center justify-center gap-2 ${
            activeTab === 'Past' ? 'border-b-2' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
          style={activeTab === 'Past' ? { borderColor: primaryColor, color: primaryColor } : {}}
        >
          <span>{t('pastPollsTab')}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">{pastPolls.length}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full p-4">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <LoadingSpinner message={t('loading')} />
          </div>
        ) : activeTab === 'Active' ? (
          <div className="flex flex-col gap-4 pb-6">
            {activePolls.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-xs">
                <p className="text-sm font-bold text-gray-700">{t('noActivePolls')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('noActivePollsDesc')}</p>
              </div>
            ) : (
              activePolls.map((poll, pollIdx) => {
                const pId = String(poll._id || poll.id);
                const isMulti = Boolean(poll.allowMultipleChoices);
                const maxChoices = isMulti ? (poll.maxChoices || poll.options.length) : 1;
                const hasVoted = Boolean(poll.hasVoted || poll.isVoted);
                const userVotedIds = poll.userVotedIds || (poll.userVoted ? [poll.userVoted] : []);
                const currentSelected = selections[pId] || [];
                const isSubmitting = submittingPollId === pId;
                const totalVotes = poll.totalVotes || 0;

                return (
                  <div 
                    key={pId} 
                    className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 relative overflow-hidden"
                  >
                    {/* Top Badges: Unique Sr. No. (Q1, Q2...) + Area */}
                    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Q{pollIdx + 1}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 tracking-wide">
                          <HiMapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{poll.area || poll.targetArea?.name || 'All Constituency'}</span>
                        </span>
                        {isMulti && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-100">
                            {t('multiChoiceBadge')} ({t('selectUpTo')} {maxChoices})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question & Description */}
                    <h3 className="text-sm font-extrabold text-gray-900 leading-snug mb-1">
                      {poll.question}
                    </h3>
                    {poll.description && (
                      <p className="text-[11px] text-gray-500 font-medium mb-3.5 leading-relaxed">
                        {poll.description}
                      </p>
                    )}

                    {/* Options List */}
                    <div className="flex flex-col gap-2.5">
                      {poll.options.map(opt => {
                        const optId = String(opt.optionId || opt._id || opt.id);
                        const isChosenByMe = userVotedIds.includes(optId);
                        const isCurrentlySelected = currentSelected.includes(optId);

                        return (
                          <div 
                            key={optId}
                            onClick={() => !hasVoted && handleToggleOption(poll, optId)}
                            className={`relative rounded-2xl p-3.5 border-2 transition-all overflow-hidden ${
                              hasVoted
                                ? isChosenByMe
                                ? 'border-transparent shadow-xs'
                                : 'border-gray-100 bg-gray-50/50'
                                : isCurrentlySelected
                                ? 'cursor-pointer shadow-xs active:scale-[0.99]'
                                : 'cursor-pointer border-gray-200 hover:border-gray-300 hover:bg-gray-50/70 active:scale-[0.99]'
                            }`}
                            style={
                              (hasVoted && isChosenByMe) || isCurrentlySelected
                                ? { borderColor: primaryColor, backgroundColor: `${primaryColor}08` }
                                : {}
                            }
                          >
                            <div className="relative z-10 flex justify-between items-center gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {!hasVoted ? (
                                  isMulti ? (
                                    <div 
                                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                        isCurrentlySelected ? 'border-transparent text-white' : 'border-gray-300 bg-white'
                                      }`}
                                      style={isCurrentlySelected ? { backgroundColor: primaryColor } : {}}
                                    >
                                      {isCurrentlySelected && <HiCheck className="w-3.5 h-3.5 stroke-2" />}
                                    </div>
                                  ) : (
                                    <div 
                                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                        isCurrentlySelected ? 'border-transparent text-white' : 'border-gray-300 bg-white'
                                      }`}
                                      style={isCurrentlySelected ? { backgroundColor: primaryColor } : {}}
                                    >
                                      {isCurrentlySelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                    </div>
                                  )
                                ) : (
                                  <div 
                                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-xs"
                                    style={{ backgroundColor: isChosenByMe ? primaryColor : '#94a3b8' }}
                                  >
                                    {isChosenByMe ? (
                                      <HiCheck className="w-3.5 h-3.5 text-white stroke-2" />
                                    ) : (
                                      <div className="w-2 h-2 rounded-full bg-white/70"></div>
                                    )}
                                  </div>
                                )}

                                <span className={`text-xs leading-tight ${
                                  (hasVoted && isChosenByMe) || isCurrentlySelected 
                                    ? 'text-gray-900 font-extrabold' 
                                    : 'text-gray-700 font-semibold'
                                }`}>
                                  {opt.text}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Submit Vote Button for un-voted polls */}
                    {!hasVoted && (
                      <div className="mt-4 pt-3.5 border-t border-gray-100 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold text-gray-500">
                          {isMulti ? (
                            <span>{currentSelected.length} of {maxChoices} {t('options')}</span>
                          ) : (
                            <span>{currentSelected.length ? `1 ${t('options')}` : t('tapToSelect')}</span>
                          )}
                        </span>
                        <button
                          onClick={() => handleSubmitVote(poll)}
                          disabled={currentSelected.length === 0 || isSubmitting}
                          className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {isSubmitting ? (
                            <span>{t('recordingVote')}</span>
                          ) : (
                            <>
                              <HiCheckCircle className="w-4 h-4" />
                              <span>{t('confirmVote')}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Poll Footer */}
                    <div className="mt-3.5 pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-semibold text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <HiUsers className="w-4 h-4 text-gray-400" />
                        <span>
                          {`${totalVotes.toLocaleString()} ${t('totalVotes')}`}
                        </span>
                      </span>

                      {hasVoted ? (
                        <span className="text-emerald-700 font-extrabold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-[11px]">
                          <HiCheck className="w-3.5 h-3.5" />
                          <span>{t('voted')}</span>
                        </span>
                      ) : (
                        <span 
                          className="font-extrabold text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1"
                          style={{ 
                            backgroundColor: `${primaryColor}10`, 
                            color: primaryColor,
                            borderColor: `${primaryColor}30`
                          }}
                        >
                          {isMulti ? `${t('selectUpTo')} ${maxChoices} ${t('options')}` : t('tapToSelect')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Past Polls Tab */
          <div className="flex flex-col gap-4 pb-6">
            {pastPolls.length > 0 ? (
              pastPolls.map((poll, pollIdx) => {
                const pId = String(poll._id || poll.id);
                const pollTotal = poll.totalVotes || 0;

                return (
                  <div key={pId} className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100">
                    <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Q{pollIdx + 1}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                          <HiMapPin className="w-3 h-3 text-gray-500" />
                          <span>{poll.area || poll.targetArea?.name || 'All Constituency'}</span>
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-400">
                        {t('votingClosed')}
                      </span>
                    </div>

                    <h3 className="text-xs font-extrabold text-gray-900 leading-snug mb-3">
                      {poll.question}
                    </h3>

                    <div className="flex flex-col gap-2">
                      {poll.options.map(opt => {
                        const optId = opt.optionId || opt._id || opt.id;
                        const isWinner = poll.winnerOption?.optionId === optId && pollTotal > 0;

                        return (
                          <div 
                            key={optId} 
                            className={`relative rounded-2xl p-3 border overflow-hidden ${
                              isWinner ? 'bg-amber-50/40 border-amber-200' : 'bg-gray-50 border-gray-100'
                            }`}
                          >
                            <div className="relative z-10 flex justify-between items-center gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {isWinner && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                                    {t('winner')}
                                  </span>
                                )}
                                <span className="text-xs font-bold text-gray-800 truncate">{opt.text}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-3 text-right text-[11px] font-bold text-gray-400">
                      {t('totalParticipants')} {pollTotal.toLocaleString()}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                <p className="text-sm font-bold text-gray-700">{t('noPastPolls')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('noPastPollsDesc')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}


