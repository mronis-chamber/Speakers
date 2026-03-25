import React, { useEffect, useState, useMemo } from 'react';

const allTopics = ["Policy", "Global Affairs", "Economy", "Women in Leadership", "Finance", "Defense", "Climate", "Technology", "Innovation"];

const topicSynonyms = {
  Policy: ['policy', 'public policy', 'government', 'regulation', 'regulatory', 'legislation'],
  'Global Affairs': ['global affairs', 'geopolitics', 'geopolitical', 'international', 'foreign policy', 'world affairs'],
  Economy: ['economy', 'economic', 'macroeconomics', 'macro', 'markets', 'market'],
  'Women in Leadership': ['women in leadership', 'women leaders', 'female leadership', 'leadership'],
  Finance: ['finance', 'financial', 'investing', 'investment', 'equities', 'capital markets'],
  Defense: ['defense', 'national security', 'security', 'military'],
  Climate: ['climate', 'climate change', 'sustainability', 'energy transition'],
  Technology: ['technology', 'tech', 'ai', 'artificial intelligence', 'digital'],
  Innovation: ['innovation', 'innovative', 'disruption', 'emerging tech'],
};

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const speakerMatchesTopic = (selectedTopic, speakerTopics) => {
  const selectedNorm = normalizeText(selectedTopic);
  const selectedTerms = topicSynonyms[selectedTopic] || [selectedTopic];
  const selectedNormTerms = selectedTerms.map(normalizeText).filter(Boolean);
  const topicBlob = normalizeText((speakerTopics || []).join(' '));
  const topicWords = new Set(topicBlob.split(' ').filter(Boolean));

  return selectedNormTerms.some((term) => {
    if (!term) return false;
    if (topicBlob.includes(term) || term.includes(topicBlob)) return true;

    const parts = term.split(' ').filter(Boolean);
    return parts.some((part) => {
      if (topicWords.has(part)) return true;
      for (const word of topicWords) {
        if (word.includes(part) || part.includes(word)) return true;
      }
      return false;
    });
  }) || topicBlob.includes(selectedNorm);
};

// Inline SVGs to guarantee they render
const Icons = {
  Globe: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>,
  Chart: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
  Chip: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m14-6h2m-2 6h2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  Search: ({className="h-6 w-6"}) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>,
  Sort: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  Sync: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
};

function EditSpeakerModal({ speaker, onClose, onSave }) {
  const [form, setForm] = useState({
    name: speaker?.name || '',
    role: speaker?.role || '',
    bureau: speaker?.bureau || '',
    location: speaker?.location || '',
    fee: speaker?.fee || '',
    bio: speaker?.bio || '',
    topicsText: (speaker?.topics || []).join(', '),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const handleSave = async () => {
    setSaveError(null);
    try {
      setIsSaving(true);
      await onSave(form);
      onClose();
    } catch (err) {
      setSaveError(err?.message || 'Failed to save speaker');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl border-2 border-gray-300 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6 border-b-2 border-gray-200 pb-4">
          <h3 className="text-2xl font-serif font-bold text-black">Edit Speaker Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-black font-bold text-sm uppercase"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Current Title" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} />
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Speakers Bureau" value={form.bureau} onChange={(e) => setForm((p) => ({ ...p, bureau: e.target.value }))} />
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Fee Range" value={form.fee} onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))} />
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Topics (comma separated)" value={form.topicsText} onChange={(e) => setForm((p) => ({ ...p, topicsText: e.target.value }))} />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-bold uppercase tracking-wider text-black mb-2">Notes / Bio</label>
          <textarea
            className="w-full min-h-40 border-2 border-gray-300 rounded px-3 py-2 font-medium"
            value={form.bio}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
          />
        </div>

        {saveError && (
          <div className="mt-4 text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {saveError}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 border-2 border-gray-400 rounded font-bold text-gray-700 bg-white hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 border-2 border-blue-900 rounded font-bold text-white bg-blue-700 hover:bg-blue-900"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddSpeakerModal({ tagOptions, onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '',
    role: '',
    bureau: '',
    location: '',
    fee: '',
    bio: '',
    selectedTags: [],
    customTagsText: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [tagSearch, setTagSearch] = useState('');

  const filteredTags = tagOptions.filter((tag) =>
    tag.toLowerCase().includes(tagSearch.toLowerCase().trim()),
  );

  const toggleTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag],
    }));
  };

  const handleCreate = async () => {
    setSaveError(null);
    try {
      setIsSaving(true);
      const customTags = form.customTagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const topics = [...new Set([...form.selectedTags, ...customTags])];
      await onCreate({
        name: form.name,
        role: form.role,
        bureau: form.bureau,
        location: form.location,
        fee: form.fee,
        bio: form.bio,
        topics,
      });
      onClose();
    } catch (err) {
      setSaveError(err?.message || 'Failed to create speaker');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl border-2 border-gray-300 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 border-b-2 border-gray-200 pb-4">
          <h3 className="text-2xl font-serif font-bold text-black">Add Speaker</h3>
          <button onClick={onClose} className="text-gray-700 hover:text-black font-bold text-sm uppercase">
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Name *" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Current Title" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} />
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Speakers Bureau" value={form.bureau} onChange={(e) => setForm((p) => ({ ...p, bureau: e.target.value }))} />
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Fee Range (e.g. 10-25K)" value={form.fee} onChange={(e) => setForm((p) => ({ ...p, fee: e.target.value }))} />
          <input className="border-2 border-gray-300 rounded px-3 py-2 font-medium" placeholder="Additional tags (comma separated)" value={form.customTagsText} onChange={(e) => setForm((p) => ({ ...p, customTagsText: e.target.value }))} />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-bold uppercase tracking-wider text-black mb-2">Tag options</label>
          <div className="mb-3 flex flex-col md:flex-row md:items-center gap-2">
            <input
              className="border-2 border-gray-300 rounded px-3 py-2 font-medium md:flex-1"
              placeholder="Search tags..."
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    selectedTags: [...new Set([...prev.selectedTags, ...filteredTags])],
                  }))
                }
                className="px-3 py-2 text-xs font-bold border-2 border-gray-300 rounded bg-white hover:bg-gray-100"
              >
                Select visible
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, selectedTags: [] }))}
                className="px-3 py-2 text-xs font-bold border-2 border-gray-300 rounded bg-white hover:bg-gray-100"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="mb-2 text-xs font-bold text-gray-600 uppercase tracking-wide">
            Selected: {form.selectedTags.length}
          </div>
          <div className="max-h-44 overflow-y-auto border-2 border-gray-200 rounded p-2 flex flex-wrap gap-2">
            {tagOptions.length === 0 ? (
              <span className="text-sm text-gray-600">No tag options available yet.</span>
            ) : filteredTags.length === 0 ? (
              <span className="text-sm text-gray-600">No tags match your search.</span>
            ) : (
              filteredTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold ${
                    form.selectedTags.includes(tag)
                      ? 'bg-blue-700 border-blue-900 text-white'
                      : 'bg-white border-gray-300 text-gray-800'
                  }`}
                >
                  {tag}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-bold uppercase tracking-wider text-black mb-2">Notes / Bio</label>
          <textarea className="w-full min-h-36 border-2 border-gray-300 rounded px-3 py-2 font-medium" value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
        </div>

        {saveError && (
          <div className="mt-4 text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {saveError}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={isSaving} className="px-4 py-2 border-2 border-gray-400 rounded font-bold text-gray-700 bg-white hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={isSaving || !form.name.trim()} className="px-5 py-2 border-2 border-blue-900 rounded font-bold text-white bg-blue-700 hover:bg-blue-900 disabled:opacity-50">
            {isSaving ? 'Creating...' : 'Create Speaker'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('home'); 
  const [speakers, setSpeakers] = useState([]);
  const [speakersLoading, setSpeakersLoading] = useState(true);
  const [speakersError, setSpeakersError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [mondayConnection, setMondayConnection] = useState({
    checking: true,
    connected: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const checkConnection = async () => {
      try {
        const res = await fetch('/.netlify/functions/monday-connection', { method: 'GET' });
        const data = await res.json();
        const connected = Boolean(data?.connected);

        if (cancelled) return;

        setMondayConnection({
          checking: false,
          connected,
          error: data?.error ?? null,
        });
      } catch (err) {
        if (cancelled) return;
        setMondayConnection({
          checking: false,
          connected: false,
          error: err?.message ?? 'Unknown error',
        });
      }
    };

    checkConnection();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSpeakers = async () => {
      try {
        setSpeakersLoading(true);
        const res = await fetch('/.netlify/functions/speakers', { method: 'GET' });
        const data = await res.json();

        if (cancelled) return;
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || `Failed to load speakers (${res.status})`);
        }

        setSpeakers(Array.isArray(data.speakers) ? data.speakers : []);
        setSpeakersError(null);
      } catch (err) {
        if (cancelled) return;
        setSpeakersError(err?.message || 'Failed to load speakers');
        setSpeakers([]);
      } finally {
        if (!cancelled) setSpeakersLoading(false);
      }
    };

    fetchSpeakers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filters & Sorting State
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [selectedFees, setSelectedFees] = useState([]);
  const [selectedBureaus, setSelectedBureaus] = useState([]);
  const [sortBy, setSortBy] = useState("relevance"); 

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setCurrentPage('directory');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const parseFeeValue = (feeText) => {
    if (!feeText) return 999;
    const match = String(feeText).match(/(\d+)(?:\s*-\s*\d+)?K/i);
    if (!match) return 999;
    return Number(match[1]) || 999;
  };

  const allBureaus = useMemo(() => {
    return [...new Set(speakers.map((s) => s.bureau).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [speakers]);
  const allTagOptions = useMemo(() => {
    const tags = speakers.flatMap((s) => s.topics || []).map((t) => String(t).trim()).filter(Boolean);
    return [...new Set(tags)].sort((a, b) => a.localeCompare(b));
  }, [speakers]);

  const filteredAndSortedSpeakers = useMemo(() => {
    let result = speakers.filter(speaker => {
      const topicText = (speaker.topics || []).join(' ').toLowerCase();
      const matchesSearch = speaker.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            speaker.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            speaker.bio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            topicText.includes(searchTerm.toLowerCase());

      const matchesTopic =
        selectedTopics.length === 0 ||
        selectedTopics.some((t) => speakerMatchesTopic(t, speaker.topics));
      const matchesFee = selectedFees.length === 0 || selectedFees.includes(speaker.fee);
      const matchesBureau = selectedBureaus.length === 0 || selectedBureaus.includes(speaker.bureau);

      return matchesSearch && matchesTopic && matchesFee && matchesBureau;
    });

    result.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'fee-asc') return a.feeValue - b.feeValue;
      if (sortBy === 'fee-desc') {
        if (a.feeValue === 999) return 1;
        if (b.feeValue === 999) return -1;
        return b.feeValue - a.feeValue;
      }
      return 0; 
    });

    return result;
  }, [speakers, searchTerm, selectedTopics, selectedFees, selectedBureaus, sortBy]);

  const openEditModal = (speaker) => {
    setEditingSpeaker(speaker);
  };

  const closeEditModal = () => {
    setEditingSpeaker(null);
  };

  const handleSaveSpeaker = async (form) => {
    if (!editingSpeaker) return;
    const nextSpeaker = {
      ...editingSpeaker,
      name: form.name.trim(),
      role: form.role.trim(),
      bureau: form.bureau.trim(),
      location: form.location.trim(),
      fee: form.fee.trim() || 'N/A',
      feeValue: parseFeeValue(form.fee.trim() || 'N/A'),
      bio: form.bio.trim(),
      topics: form.topicsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const res = await fetch('/.netlify/functions/update-speaker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: nextSpeaker.id,
        name: nextSpeaker.name,
        role: nextSpeaker.role,
        bureau: nextSpeaker.bureau,
        location: nextSpeaker.location,
        fee: nextSpeaker.fee,
        bio: nextSpeaker.bio,
        topics: nextSpeaker.topics,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `Save failed (${res.status})`);
    }

    setSpeakers((prev) => prev.map((s) => (s.id === editingSpeaker.id ? nextSpeaker : s)));
  };

  const handleCreateSpeaker = async (form) => {
    const feeText = (form.fee || '').trim() || 'N/A';
    const nextSpeakerDraft = {
      name: form.name.trim(),
      role: (form.role || '').trim(),
      bureau: (form.bureau || '').trim(),
      location: (form.location || '').trim(),
      fee: feeText,
      feeValue: parseFeeValue(feeText),
      bio: (form.bio || '').trim(),
      topics: form.topics || [],
    };

    const res = await fetch('/.netlify/functions/create-speaker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextSpeakerDraft),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `Create failed (${res.status})`);
    }

    setSpeakers((prev) => [
      { ...nextSpeakerDraft, id: String(data.itemId || `${Date.now()}`) },
      ...prev,
    ]);
  };

  // --- HOME PAGE COMPONENT ---
  const HomePage = () => (
    <div className="animate-fade-in">
      <div className="bg-gray-900 text-white py-24 px-6 relative overflow-hidden border-b-8 border-blue-700">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-serif mb-6 leading-tight font-bold text-white">Internal Speaker Database</h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-10 font-medium max-w-2xl mx-auto">
            Search, filter, and manage speaker profiles. Data is synced directly with your monday.com board.
          </p>

          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2 max-w-3xl mx-auto bg-white p-3 rounded-lg shadow-2xl border-4 border-gray-300">
            <div className="flex-1 flex items-center px-4 text-gray-600">
              <Icons.Search />
              <input 
                type="text" 
                placeholder="Search by name, topic, or keyword..." 
                className="w-full py-3 px-4 text-black text-xl font-medium focus:outline-none placeholder-gray-500"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <button type="submit" className="bg-blue-700 hover:bg-blue-900 text-white px-8 py-4 rounded-md font-bold text-xl transition-colors shadow-md border-2 border-blue-900">
              Search Speakers
            </button>
          </form>
        </div>
      </div>

      <div className="py-20 px-6 bg-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-10 border-b-2 border-gray-400 pb-4">
            <h2 className="text-4xl font-serif text-black font-bold">Explore by Topic</h2>
            <button onClick={() => setCurrentPage('directory')} className="text-blue-800 font-bold text-lg hover:underline bg-white px-4 py-2 rounded border-2 border-blue-800">
              View All Speakers &rarr;
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {["Global Affairs", "Economy", "Technology", "Leadership"].map(topic => (
              <div 
                key={topic}
                onClick={() => {
                  setSelectedTopics([topic]);
                  setCurrentPage('directory');
                }}
                className="bg-white p-8 rounded-xl shadow-lg border-2 border-gray-300 hover:shadow-2xl hover:border-blue-600 transition-all cursor-pointer text-center group"
              >
                <div className="w-20 h-20 mx-auto bg-gray-100 text-blue-800 rounded-full flex items-center justify-center mb-4 border-2 border-gray-300 group-hover:bg-blue-700 group-hover:text-white transition-colors shadow-sm">
                  {topic === "Global Affairs" && <Icons.Globe />}
                  {topic === "Economy" && <Icons.Chart />}
                  {topic === "Technology" && <Icons.Chip />}
                  {topic === "Leadership" && <Icons.Users />}
                </div>
                <h3 className="text-xl font-bold text-black">{topic}</h3>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // --- DIRECTORY PAGE COMPONENT ---
  const DirectoryPage = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row gap-8 animate-fade-in">
      <aside className="w-full md:w-80 flex-shrink-0">
        <div className="sticky top-28 bg-white p-6 rounded-xl border-2 border-gray-300 shadow-lg max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex items-center justify-between mb-6 border-b-2 border-gray-200 pb-4">
            <h2 className="text-2xl font-serif text-black font-bold">Refine Search</h2>
            {(selectedTopics.length > 0 || selectedFees.length > 0 || selectedBureaus.length > 0 || searchInput) && (
              <button 
                onClick={() => { setSearchInput(""); setSearchTerm(""); setSelectedTopics([]); setSelectedFees([]); setSelectedBureaus([]); }}
                className="text-sm font-bold text-red-700 hover:text-red-900 uppercase tracking-wider bg-red-50 px-3 py-1 rounded border border-red-200"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold text-black uppercase tracking-widest mb-2">Keyword</label>
            <div className="relative text-gray-600">
              <input 
                type="text" 
                placeholder="Search names, bios..." 
                className="w-full pl-4 pr-10 py-3 bg-gray-50 border-2 border-gray-400 rounded-md text-base text-black font-medium focus:outline-none focus:border-blue-700 focus:bg-white placeholder-gray-600"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <div className="absolute right-3 top-3">
                <Icons.Search className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="mb-8 border-t-2 border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-4">Topics</h3>
            <div className="space-y-4">
              {allTopics.map(topic => (
                <label
                  key={topic}
                  className="flex items-center gap-4 cursor-pointer group"
                  onClick={() =>
                    setSelectedTopics((prev) =>
                      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
                    )
                  }
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${selectedTopics.includes(topic) ? 'bg-blue-700 border-blue-900 text-white' : 'bg-white border-gray-400 group-hover:border-blue-600'}`}>
                    {selectedTopics.includes(topic) && <Icons.Check />}
                  </div>
                  <span className={`text-base ${selectedTopics.includes(topic) ? 'text-black font-bold' : 'text-gray-800 font-medium'}`}>{topic}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-2 border-t-2 border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-4">Fee Range</h3>
            <div className="space-y-4">
              {["10-25K", "20-30K", "25-50K", "N/A"].map(fee => (
                <label
                  key={fee}
                  className="flex items-center gap-4 cursor-pointer group"
                  onClick={() =>
                    setSelectedFees((prev) =>
                      prev.includes(fee) ? prev.filter((f) => f !== fee) : [...prev, fee],
                    )
                  }
                >
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${selectedFees.includes(fee) ? 'bg-blue-700 border-blue-900 text-white' : 'bg-white border-gray-400 group-hover:border-blue-600'}`}>
                    {selectedFees.includes(fee) && <Icons.Check />}
                  </div>
                  <span className={`text-base ${selectedFees.includes(fee) ? 'text-black font-bold' : 'text-gray-800 font-medium'}`}>
                    {fee === 'N/A' ? 'Contact for Pricing' : `$${fee}`}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-2 border-t-2 border-gray-200 pt-6">
            <h3 className="text-sm font-bold text-black uppercase tracking-widest mb-4">Speakers Bureau</h3>
            <div className="space-y-4">
              {allBureaus.length === 0 ? (
                <p className="text-sm text-gray-600 font-medium">No bureau values found yet.</p>
              ) : (
                allBureaus.map((bureau) => (
                  <label
                    key={bureau}
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={() =>
                      setSelectedBureaus((prev) =>
                        prev.includes(bureau) ? prev.filter((b) => b !== bureau) : [...prev, bureau],
                      )
                    }
                  >
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${selectedBureaus.includes(bureau) ? 'bg-blue-700 border-blue-900 text-white' : 'bg-white border-gray-400 group-hover:border-blue-600'}`}>
                      {selectedBureaus.includes(bureau) && <Icons.Check />}
                    </div>
                    <span className={`text-base ${selectedBureaus.includes(bureau) ? 'text-black font-bold' : 'text-gray-800 font-medium'}`}>{bureau}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b-2 border-gray-300">
          <h1 className="text-4xl font-serif text-black mb-4 sm:mb-0 font-bold">
            Speaker Directory <span className="text-xl text-gray-600 font-sans ml-2 font-bold bg-gray-200 px-3 py-1 rounded-full">({filteredAndSortedSpeakers.length})</span>
          </h1>

          <div className="flex items-center gap-3 bg-white border-2 border-gray-400 shadow-sm rounded-md px-4 py-2 text-black">
            <Icons.Sort />
            <select 
              className="bg-transparent text-base font-bold text-black focus:outline-none cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="relevance">Sort by: Relevance</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
              <option value="fee-asc">Fee: Low to High</option>
              <option value="fee-desc">Fee: High to Low</option>
            </select>
          </div>
        </div>

        <div className="space-y-6">
          {speakersLoading ? (
            <div className="py-20 text-center bg-white rounded-xl border-2 border-gray-300 shadow-lg">
              <h3 className="text-2xl font-serif text-black mb-3 font-bold">Loading speakers...</h3>
              <p className="text-lg text-gray-700 font-medium">Reading records from monday.com board.</p>
            </div>
          ) : speakersError ? (
            <div className="py-20 text-center bg-white rounded-xl border-2 border-red-300 shadow-lg">
              <h3 className="text-2xl font-serif text-black mb-3 font-bold">Could not load speakers</h3>
              <p className="text-lg text-red-700 font-medium">{speakersError}</p>
            </div>
          ) : filteredAndSortedSpeakers.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-xl border-2 border-gray-300 shadow-lg">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gray-300 text-gray-500">
                <Icons.Search className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-serif text-black mb-3 font-bold">No speakers found</h3>
              <p className="text-lg text-gray-700 font-medium">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            filteredAndSortedSpeakers.map(speaker => (
              <div key={speaker.id} className="bg-white border-2 border-gray-300 rounded-xl p-6 sm:p-8 shadow-lg hover:shadow-2xl hover:border-blue-700 transition-all duration-300 flex flex-col sm:flex-row gap-8 group">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gray-100 border-4 border-gray-300 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 group-hover:border-blue-500 transition-colors shadow-inner">
                  <span className="text-3xl sm:text-4xl font-serif text-gray-700 font-bold group-hover:text-blue-800 transition-colors">
                    {speaker.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4">
                    <div>
                      <h2 className="text-3xl font-serif text-black font-bold group-hover:text-blue-800 transition-colors cursor-pointer">
                        {speaker.name}
                      </h2>
                      <p className="text-blue-800 font-bold text-base uppercase tracking-widest mt-2">
                        {speaker.role}
                      </p>
                    </div>
                    <div className="mt-4 sm:mt-0 text-left sm:text-right bg-gray-100 sm:bg-transparent p-4 sm:p-0 rounded-lg border-2 border-gray-300 sm:border-none">
                      <p className="text-2xl font-black text-black">{speaker.fee === 'N/A' ? 'Contact Us' : `$${speaker.fee}`}</p>
                      <p className="text-sm text-gray-700 uppercase tracking-widest font-bold mt-1">Bureau: {speaker.bureau}</p>
                    </div>
                  </div>

                  <p className="text-gray-800 text-lg leading-relaxed mb-6 mt-4 font-medium">
                    {speaker.bio}
                  </p>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pt-6 border-t-2 border-gray-200">
                    <div className="flex flex-wrap gap-3">
                      {speaker.topics.map((topic, idx) => (
                        <span key={idx} className="text-sm font-bold text-blue-900 bg-blue-100 border-2 border-blue-300 px-4 py-2 rounded-full">
                          {topic}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => openEditModal(speaker)}
                      className="text-white font-bold text-base bg-blue-700 hover:bg-blue-900 px-6 py-3 rounded-md border-2 border-blue-900 flex items-center gap-2 group-hover:translate-x-1 transition-transform shadow-md"
                    >
                      View / Edit Profile <Icons.Edit />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-200 font-sans text-black">
      <style>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <header className="bg-white border-b-4 border-gray-300 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div 
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => setCurrentPage('home')}
          >
            <div className="w-12 h-12 bg-black rounded flex items-center justify-center text-white font-serif text-2xl italic shadow-lg border-2 border-gray-800">C</div>
            <span className="text-3xl font-serif text-black tracking-tight font-black">Chamber<span className="font-sans font-medium text-gray-600 ml-1">Internal</span></span>
          </div>

          <nav className="hidden md:flex gap-10 text-base font-black uppercase tracking-widest text-gray-600">
            <button 
              onClick={() => setCurrentPage('home')} 
              className={`hover:text-black transition-colors ${currentPage === 'home' ? 'text-black border-b-4 border-black pb-1' : ''}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setCurrentPage('directory')} 
              className={`hover:text-black transition-colors ${currentPage === 'directory' ? 'text-black border-b-4 border-black pb-1' : ''}`}
            >
              Directory
            </button>
            <button onClick={() => setShowAddModal(true)} className="hover:text-black transition-colors">Add Speaker</button>
          </nav>

          <button
            type="button"
            disabled={!mondayConnection.connected || mondayConnection.checking}
            title={mondayConnection.error ?? ''}
            className={`bg-black hover:bg-gray-800 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wide transition-colors shadow-lg border-2 border-gray-900 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                mondayConnection.checking
                  ? 'bg-yellow-500'
                  : mondayConnection.connected
                    ? 'bg-green-500'
                    : 'bg-red-500'
              }`}
            />
            <span className="scale-90">
              <Icons.Sync />
            </span>
            <span>
              {mondayConnection.checking
                ? 'Checking Monday...'
                : mondayConnection.connected
                  ? 'Monday Connected - Sync'
                  : 'Monday Not Connected'}
            </span>
          </button>
        </div>
      </header>

      <main>
        {currentPage === 'home' ? HomePage() : DirectoryPage()}
      </main>

      {editingSpeaker && (
        <EditSpeakerModal
          speaker={editingSpeaker}
          onClose={closeEditModal}
          onSave={handleSaveSpeaker}
        />
      )}

      {showAddModal && (
        <AddSpeakerModal
          tagOptions={allTagOptions}
          onClose={() => setShowAddModal(false)}
          onCreate={handleCreateSpeaker}
        />
      )}

      <footer className="bg-black text-gray-300 py-16 text-center text-base mt-20 border-t-8 border-blue-700">
        <div className="max-w-7xl mx-auto px-6">
          <p className="font-bold text-white">&copy; 2024 Chamber Internal Tools.</p>
          <p className="mt-3 text-gray-400 font-medium">Connected live to monday.com</p>
        </div>
      </footer>
    </div>
  );
}