const { useState, useEffect } = React;
const { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = Recharts;
const { PlusCircle, TrendingUp, Award, Plus, X, Flame, Coffee, DollarSign, Users, Download, Calendar, BarChart3, Settings } = lucide;

const DEFAULT_FLAVORS = [
  'Original', 'Sugar Free', 'Tropical', 'Watermelon', 'Coconut Berry',
  'Red Edition', 'Blue Edition', 'Yellow Edition', 'Orange Edition',
  'Green Edition', 'Purple Edition', 'Winter Edition', 'Other'
];

const CAFFEINE_PER_CAN = 80;

// Simple localStorage wrapper to simulate window.storage API
const storage = {
  get: async (key) => {
    const value = localStorage.getItem(key);
    return value ? { key, value, shared: false } : null;
  },
  set: async (key, value) => {
    localStorage.setItem(key, value);
    return { key, value, shared: false };
  },
  delete: async (key) => {
    localStorage.removeItem(key);
    return { key, deleted: true, shared: false };
  }
};

function RedBullTracker() {
  const [entries, setEntries] = useState([]);
  const [flavors, setFlavors] = useState(DEFAULT_FLAVORS);
  const [settings, setSettings] = useState({ trackTime: false, trackCost: false, defaultCost: 2.5 });
  const [newEntry, setNewEntry] = useState({
    person: '', flavor: DEFAULT_FLAVORS[0], date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5), cost: 2.5
  });
  const [newFlavor, setNewFlavor] = useState('');
  const [showAddFlavor, setShowAddFlavor] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [entriesRes, flavorsRes, settingsRes] = await Promise.all([
        storage.get('redbull-entries').catch(() => null),
        storage.get('redbull-flavors').catch(() => null),
        storage.get('redbull-settings').catch(() => null)
      ]);
      
      if (entriesRes?.value) setEntries(JSON.parse(entriesRes.value));
      if (flavorsRes?.value) setFlavors(JSON.parse(flavorsRes.value));
      if (settingsRes?.value) {
        const loadedSettings = JSON.parse(settingsRes.value);
        setSettings(loadedSettings);
        setNewEntry(prev => ({ ...prev, cost: loadedSettings.defaultCost }));
      }
    } catch (error) {
      console.log('Starting fresh');
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newEntries, newFlavors, newSettings) => {
    try {
      await Promise.all([
        storage.set('redbull-entries', JSON.stringify(newEntries || entries)),
        storage.set('redbull-flavors', JSON.stringify(newFlavors || flavors)),
        storage.set('redbull-settings', JSON.stringify(newSettings || settings))
      ]);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const addEntry = () => {
    const capitalizedName = newEntry.person.trim().charAt(0).toUpperCase() + newEntry.person.trim().slice(1).toLowerCase();
    
    if (!capitalizedName) {
      alert('Please enter your name!');
      return;
    }

    const entry = {
      id: Date.now(),
      ...newEntry,
      person: capitalizedName,
      timestamp: new Date().toISOString()
    };

    const updated = [...entries, entry];
    setEntries(updated);
    saveData(updated, null, null);
    
    setNewEntry({
      person: capitalizedName,
      flavor: flavors[0],
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      cost: settings.defaultCost
    });
  };

  const addFlavor = () => {
    if (!newFlavor.trim() || flavors.includes(newFlavor.trim())) {
      alert('Invalid or duplicate flavor!');
      return;
    }
    const updated = [...flavors, newFlavor.trim()];
    setFlavors(updated);
    saveData(null, updated, null);
    setNewFlavor('');
    setShowAddFlavor(false);
  };

  const deleteFlavor = (flavor) => {
    if (flavors.length <= 1 || entries.some(e => e.flavor === flavor) && !confirm(`Delete "${flavor}"?`)) return;
    const updated = flavors.filter(f => f !== flavor);
    setFlavors(updated);
    saveData(null, updated, null);
  };

  const deleteEntry = (id) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveData(updated, null, null);
  };

  const updateSettings = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    if (key === 'defaultCost') setNewEntry(prev => ({ ...prev, cost: value }));
    saveData(null, null, updated);
  };

  const exportData = () => {
    const csv = [
      ['Person', 'Flavor', 'Date', 'Time', 'Cost', 'Caffeine (mg)'],
      ...entries.map(e => [e.person, e.flavor, e.date, e.time || '', e.cost || '', CAFFEINE_PER_CAN])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redbull-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStreak = (person) => {
    const userEntries = entries.filter(e => e.person === person).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!userEntries.length) return 0;
    
    let streak = 1;
    for (let i = 0; i < userEntries.length - 1; i++) {
      const current = new Date(userEntries[i].date);
      const next = new Date(userEntries[i + 1].date);
      const diffDays = Math.floor((current - next) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) streak++;
      else break;
    }
    return streak;
  };

  const getPersonStats = (person) => {
    const userEntries = entries.filter(e => e.person === person);
    return {
      total: userEntries.length,
      caffeine: userEntries.length * CAFFEINE_PER_CAN,
      cost: settings.trackCost ? userEntries.reduce((sum, e) => sum + (parseFloat(e.cost) || 0), 0) : 0,
      streak: getStreak(person)
    };
  };

  const getAllPeople = () => [...new Set(entries.map(e => e.person))];

  const getTimeOfDayData = () => {
    if (!settings.trackTime) return [];
    const periods = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    entries.forEach(e => {
      if (!e.time) return;
      const hour = parseInt(e.time.split(':')[0]);
      if (hour >= 5 && hour < 12) periods.Morning++;
      else if (hour >= 12 && hour < 17) periods.Afternoon++;
      else if (hour >= 17 && hour < 21) periods.Evening++;
      else periods.Night++;
    });
    return Object.entries(periods).map(([name, value]) => ({ name, value }));
  };

  const getPeriodComparison = () => {
    const now = new Date();
    const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisWeek = entries.filter(e => new Date(e.date) >= thisWeekStart).length;
    const lastWeek = entries.filter(e => {
      const d = new Date(e.date);
      return d >= lastWeekStart && d < thisWeekStart;
    }).length;

    const thisMonth = entries.filter(e => new Date(e.date) >= thisMonthStart).length;
    const lastMonth = entries.filter(e => {
      const d = new Date(e.date);
      return d >= lastMonthStart && d < thisMonthStart;
    }).length;

    return { thisWeek, lastWeek, thisMonth, lastMonth };
  };

  const getRecaps = (person = null) => {
    const recapsByPeriod = {};
    const filteredEntries = person ? entries.filter(e => e.person === person) : entries;
    
    filteredEntries.forEach(e => {
      const date = new Date(e.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const yearKey = `${date.getFullYear()}`;
      
      if (!recapsByPeriod[monthKey]) recapsByPeriod[monthKey] = { type: 'month', count: 0, caffeine: 0, cost: 0 };
      if (!recapsByPeriod[yearKey]) recapsByPeriod[yearKey] = { type: 'year', count: 0, caffeine: 0, cost: 0 };
      
      recapsByPeriod[monthKey].count++;
      recapsByPeriod[monthKey].caffeine += CAFFEINE_PER_CAN;
      recapsByPeriod[monthKey].cost += parseFloat(e.cost) || 0;
      
      recapsByPeriod[yearKey].count++;
      recapsByPeriod[yearKey].caffeine += CAFFEINE_PER_CAN;
      recapsByPeriod[yearKey].cost += parseFloat(e.cost) || 0;
    });
    
    return Object.entries(recapsByPeriod).sort((a, b) => b[0].localeCompare(a[0]));
  };

  if (loading) {
    return React.createElement('div', { className: "flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-red-600" },
      React.createElement('div', { className: "text-xl text-white" }, 'Loading...')
    );
  }

  const comparison = getPeriodComparison();
  const totalCaffeine = entries.length * CAFFEINE_PER_CAN;
  const totalCost = settings.trackCost ? entries.reduce((sum, e) => sum + (parseFloat(e.cost) || 0), 0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-red-600 p-2 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-block bg-red-600 px-4 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-3xl shadow-2xl transform -rotate-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-yellow-300" style={{textShadow: '2px 2px 0px rgba(0,0,0,0.3)'}}>
              RED BULL TRACKER
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6 justify-center">
          {['dashboard', 'compare', 'recaps', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-bold transition-all text-sm sm:text-base ${
                activeTab === tab
                  ? 'bg-yellow-300 text-blue-900 shadow-lg transform scale-105'
                  : 'bg-white text-blue-900 hover:bg-yellow-100'
              }`}
            >
              {tab === 'dashboard' && React.createElement(BarChart3, { className: "inline mr-1 sm:mr-2", size: 16 })}
              {tab === 'compare' && React.createElement(Users, { className: "inline mr-1 sm:mr-2", size: 16 })}
              {tab === 'recaps' && React.createElement(Calendar, { className: "inline mr-1 sm:mr-2", size: 16 })}
              {tab === 'settings' && React.createElement(Settings, { className: "inline mr-1 sm:mr-2", size: 16 })}
              <span className="hidden sm:inline">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              <span className="sm:hidden">{tab.charAt(0).toUpperCase()}</span>
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <>
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6 border-4 border-yellow-400">
              <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2 text-red-600">
                {React.createElement(PlusCircle, { size: 20 })}
                Log a Red Bull
              </h2>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={newEntry.person}
                  onChange={(e) => setNewEntry({...newEntry, person: e.target.value})}
                  className="px-4 py-2 border-2 border-blue-900 rounded-lg focus:border-red-600 focus:outline-none font-semibold text-base"
                />
                <select
                  value={newEntry.flavor}
                  onChange={(e) => setNewEntry({...newEntry, flavor: e.target.value})}
                  className="px-4 py-2 border-2 border-blue-900 rounded-lg focus:border-red-600 focus:outline-none font-semibold text-base"
                >
                  {flavors.map(f => React.createElement('option', { key: f, value: f }, f))}
                </select>
                <input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                  className="px-4 py-2 border-2 border-blue-900 rounded-lg focus:border-red-600 focus:outline-none font-semibold text-base"
                />
                {settings.trackTime && (
                  <input
                    type="time"
                    value={newEntry.time}
                    onChange={(e) => setNewEntry({...newEntry, time: e.target.value})}
                    className="px-4 py-2 border-2 border-blue-900 rounded-lg focus:border-red-600 focus:outline-none font-semibold text-base"
                  />
                )}
                {settings.trackCost && (
                  <input
                    type="number"
                    step="0.1"
                    value={newEntry.cost}
                    onChange={(e) => setNewEntry({...newEntry, cost: e.target.value})}
                    className="px-4 py-2 border-2 border-blue-900 rounded-lg focus:border-red-600 focus:outline-none font-semibold text-base"
                    placeholder="Cost (€)"
                  />
                )}
                <button
                  onClick={addEntry}
                  className="bg-red-600 text-yellow-300 px-6 py-3 rounded-lg font-black text-lg hover:bg-red-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  ADD
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-yellow-300 rounded-xl shadow-xl p-4 text-center border-4 border-red-600">
                <div className="text-4xl font-black text-blue-900">{entries.length}</div>
                <div className="text-red-600 font-bold text-sm">TOTAL</div>
              </div>
              <div className="bg-yellow-300 rounded-xl shadow-xl p-4 text-center border-4 border-red-600">
                {React.createElement(Coffee, { className: "w-8 h-8 mx-auto text-red-600 mb-1" })}
                <div className="text-2xl font-black text-blue-900">{totalCaffeine}mg</div>
                <div className="text-red-600 font-bold text-sm">CAFFEINE</div>
              </div>
              {settings.trackCost && (
                <div className="bg-yellow-300 rounded-xl shadow-xl p-4 text-center border-4 border-red-600">
                  {React.createElement(DollarSign, { className: "w-8 h-8 mx-auto text-blue-900 mb-1" })}
                  <div className="text-2xl font-black text-blue-900">€{totalCost.toFixed(2)}</div>
                  <div className="text-red-600 font-bold text-sm">SPENT</div>
                </div>
              )}
              <div className="bg-yellow-300 rounded-xl shadow-xl p-4 text-center border-4 border-blue-900">
                {React.createElement(Award, { className: "w-8 h-8 mx-auto text-red-600 mb-1" })}
                <div className="text-xl font-black text-blue-900">
                  {getAllPeople().sort((a, b) => getPersonStats(b).total - getPersonStats(a).total)[0] || 'N/A'}
                </div>
                <div className="text-red-600 font-bold text-sm">LEADER</div>
              </div>
            </div>

            {getAllPeople().length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-yellow-400">
                  <h3 className="text-xl font-bold mb-4 text-red-600 flex items-center gap-2">
                    {React.createElement(Flame, { className: "text-orange-500" })}
                    Current Streaks
                  </h3>
                  <div className="space-y-3">
                    {getAllPeople().map(person => {
                      const streak = getStreak(person);
                      return (
                        <div key={person} className="flex justify-between items-center p-3 bg-yellow-100 rounded-lg border-2 border-blue-900">
                          <span className="font-bold text-blue-900">{person}</span>
                          <span className="text-2xl font-black text-orange-500">{streak} day{streak !== 1 ? 's' : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-yellow-400">
                  <h3 className="text-xl font-bold mb-4 text-blue-900 flex items-center gap-2">
                    {React.createElement(TrendingUp)}
                    Period Comparison
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-100 rounded-lg border-2 border-blue-900">
                      <div className="flex justify-between">
                        <span className="font-bold text-blue-900">This Week</span>
                        <span className="font-black text-red-600">{comparison.thisWeek}</span>
                      </div>
                      <div className="text-sm text-gray-600">Last Week: {comparison.lastWeek}</div>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-lg border-2 border-blue-900">
                      <div className="flex justify-between">
                        <span className="font-bold text-blue-900">This Month</span>
                        <span className="font-black text-red-600">{comparison.thisMonth}</span>
                      </div>
                      <div className="text-sm text-gray-600">Last Month: {comparison.lastMonth}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {entries.length > 0 && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {settings.trackTime && getTimeOfDayData().some(d => d.value > 0) && (
                    <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-yellow-400">
                      <h3 className="text-xl font-bold mb-4 text-red-600">Time of Day</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={getTimeOfDayData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#E31937" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-yellow-400">
                    <h3 className="text-xl font-bold mb-4 text-blue-900">Consumption Timeline</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={entries.reduce((acc, e) => {
                        const existing = acc.find(a => a.date === e.date);
                        if (existing) existing.count++;
                        else acc.push({ date: e.date, count: 1 });
                        return acc;
                      }, []).sort((a, b) => new Date(a.date) - new Date(b.date))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="count" stroke="#E31937" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-yellow-400">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-blue-900">Recent Entries</h3>
                    <button
                      onClick={exportData}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2"
                    >
                      {React.createElement(Download, { size: 16 })}
                      Export CSV
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {[...entries].reverse().slice(0, 20).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-3 bg-yellow-100 rounded-lg border-2 border-blue-900">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-blue-900">{entry.person}</span>
                          <span className="text-red-600 font-semibold">{entry.flavor}</span>
                          <span className="text-sm text-gray-700">{entry.date}</span>
                          {settings.trackTime && entry.time && <span className="text-sm text-gray-600">{entry.time}</span>}
                          {settings.trackCost && entry.cost && <span className="text-sm text-green-600">€{entry.cost}</span>}
                        </div>
                        <button onClick={() => deleteEntry(entry.id)} className="text-red-600 hover:text-red-800 font-bold text-sm">
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === 'compare' && (
          <div className="space-y-6">
            {getAllPeople().map(person => {
              const stats = getPersonStats(person);
              return (
                <div key={person} className="bg-white rounded-2xl shadow-xl p-6 border-4 border-yellow-400">
                  <h2 className="text-3xl font-black text-blue-900 mb-4">{person}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-yellow-100 p-4 rounded-lg border-2 border-red-600 text-center">
                      <div className="text-3xl font-black text-red-600">{stats.total}</div>
                      <div className="text-sm font-bold text-blue-900">Total Cans</div>
                    </div>
                    <div className="bg-yellow-100 p-4 rounded-lg border-2 border-blue-900 text-center">
                      {React.createElement(Coffee, { className: "w-6 h-6 mx-auto text-red-600 mb-1" })}
                      <div className="text-2xl font-black text-blue-900">{stats.caffeine}mg</div>
                      <div className="text-sm font-bold text-red-600">Caffeine</div>
                    </div>
                    <div className="bg-yellow-100 p-4 rounded-lg border-2 border-red-600 text-center">
                      {React.createElement(Flame, { className: "w-6 h-6 mx-auto text-orange-500 mb-1" })}
                      <div className="text-2xl font-black text-blue-900">{stats.streak}</div>
                      <div className="text-sm font-bold text-red-600">Day Streak</div>
                    </div>
                    {settings.trackCost && (
                      <div className="bg-yellow-100 p-4 rounded-lg border-2 border-blue-900 text-center">
                        {React.createElement(DollarSign, { className: "w-6 h-6 mx-auto text-green-600 mb-1" })}
                        <div className="text-2xl font-black text-blue-900">€{stats.cost.toFixed(2)}</div>
                        <div className="text-sm font-bold text-red-600">Spent</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'recaps' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-4 border-4 border-yellow-400">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedPerson(null)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all ${
                    selectedPerson === null
                      ? 'bg-red-600 text-yellow-300'
                      : 'bg-yellow-300 text-blue-900 hover:bg-yellow-400'
                  }`}
                >
                  All Combined
                </button>
                {getAllPeople().map(person => (
                  <button
                    key={person}
                    onClick={() => setSelectedPerson(person)}
                    className={`px-4 py-2 rounded-lg font-bold transition-all ${
                      selectedPerson === person
                        ? 'bg-red-600 text-yellow-300'
                        : 'bg-yellow-300 text-blue-900 hover:bg-yellow-400'
                    }`}
                  >
                    {person}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-yellow-400">
              <h2 className="text-2xl font-bold mb-4 text-red-600">
                {selectedPerson ? `${selectedPerson}'s Recaps` : 'Combined Recaps'}
              </h2>
              <div className="space-y-4">
                {getRecaps(selectedPerson).map(([period, data]) => (
                  <div key={period} className="p-4 bg-yellow-100 rounded-lg border-2 border-blue-900">
                    <h3 className="text-xl font-bold text-blue-900 mb-2">
                      {data.type === 'year' ? `Year ${period}` : `${new Date(period + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-2xl font-black text-red-600">{data.count}</div>
                        <div className="text-sm text-gray-600">Red Bulls</div>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-blue-900">{data.caffeine}mg</div>
                        <div className="text-sm text-gray-600">Caffeine</div>
                      </div>
                      {settings.trackCost && (
                        <div>
                          <div className="text-2xl font-black text-green-600">€{data.cost.toFixed(2)}</div>
                          <div className="text-sm text-gray-600">Cost</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 border-4 border-yellow-400">
              <h2 className="text-2xl font-bold mb-4 text-red-600">Tracking Options</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.trackTime}
                    onChange={(e) => updateSettings('trackTime', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="font-bold text-blue-900">Track time of day</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.trackCost}
                    onChange={(e) => updateSettings('trackCost', e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="font-bold text-blue-900">Track cost</span>
                </label>
                {settings.trackCost && (
                  <div>
                    <label className="font-bold text-blue-900 block mb-2">Default cost per can (€)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.defaultCost}
                      onChange={(e) => updateSettings('defaultCost', parseFloat(e.target.value))}
                      className="px-4 py-2 border-2 border-blue-900 rounded-lg focus:border-red-600 focus:outline-none font-semibold w-32"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-300 rounded-2xl shadow-xl p-6 border-4 border-blue-900">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-blue-900">Manage Flavors</h2>
                <button
                  onClick={() => setShowAddFlavor(!showAddFlavor)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2"
                >
                  {React.createElement(Plus, { size: 20 })}
                  Add Flavor
                </button>
              </div>
              
              {showAddFlavor && (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Enter new flavor name"
                    value={newFlavor}
                    onChange={(e) => setNewFlavor(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFlavor()}
                    className="flex-1 px-4 py-2 border-2 border-blue-900 rounded-lg focus:border-red-600 focus:outline-none font-semibold"
                  />
                  <button
                    onClick={addFlavor}
                    className="bg-blue-900 text-yellow-300 px-6 py-2 rounded-lg font-bold hover:bg-blue-800"
                  >
                    Save
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {flavors.map(flavor => (
                  <div key={flavor} className="bg-white px-4 py-2 rounded-full flex items-center gap-2 border-2 border-blue-900 shadow">
                    <span className="font-semibold text-blue-900">{flavor}</span>
                    <button
                      onClick={() => deleteFlavor(flavor)}
                      className="text-red-600 hover:text-red-800"
                    >
                      {React.createElement(X, { size: 16 })}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(RedBullTracker));