import { useEffect, useState } from 'react';
import api from '../../Services/api';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Loader, Search, ArrowLeft, Download, Upload, 
  Filter, Calendar, X, Package, 
  LayoutGrid, Sparkles, Activity, Zap, CalendarDays,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

const PaymentPage = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportOption, setExportOption] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const { logout } = useAuth();
  const navigate = useNavigate();

  const productOptions = [
    { label: 'All Products', value: 'all', icon: LayoutGrid, color: 'primary' },
    { label: 'Tally on Cloud', value: 'Tally on Cloud', icon: Package, color: 'blue' },
    { label: 'Marg on Cloud', value: 'Marg on Cloud', icon: Package, color: 'indigo' },
    { label: 'Busy on Cloud', value: 'Busy on Cloud', icon: Package, color: 'purple' },
    { label: 'Jewellery', value: 'Jewellery', icon: Package, color: 'pink' },
    { label: 'Focus', value: 'Focus', icon: Package, color: 'green' }
  ];

  const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/requests');
      setClients(data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        logout();
        navigate('/login');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to backend. Please ensure the server is running on port 5000.');
      } else {
        setError(err.response?.data?.message || 'Failed to load leads');
      }
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone && client.phone.includes(searchTerm));
    if (!matchesSearch) return false;

    if (selectedProduct !== 'all') {
      const clientProd = client.product || '';
      if (!clientProd.toLowerCase().includes(selectedProduct.toLowerCase())) return false;
    }

    if (startDate || endDate) {
      const created = client.createdAt ? new Date(client.createdAt).toISOString().split('T')[0] : '';
      if (startDate && created < startDate) return false;
      if (endDate && created > endDate) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProduct, startDate, endDate]);

  const getDataForExport = () => {
    if (exportOption === 'all') {
      return clients;
    } else {
      return clients.filter(client => {
        const matchesSearch = 
          client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (client.phone && client.phone.includes(searchTerm));
        if (!matchesSearch) return false;

        if (selectedProduct !== 'all') {
          const clientProd = client.product || '';
          if (!clientProd.toLowerCase().includes(selectedProduct.toLowerCase())) return false;
        }

        if (exportStartDate || exportEndDate) {
          const created = client.createdAt ? new Date(client.createdAt).toISOString().split('T')[0] : '';
          if (exportStartDate && created < exportStartDate) return false;
          if (exportEndDate && created > exportEndDate) return false;
        }
        return true;
      });
    }
  };

  const exportToExcel = async () => {
    const exportData = getDataForExport();
    if (exportData.length === 0) {
      alert('No data to export for the selected criteria.');
      return;
    }
    setExporting(true);
    try {
      const sorted = [...exportData].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
      const mainSheetData = sorted.map(c => ({
        'Full Name': c.name,
        'Email': c.email,
        'Phone': c.phone,
        'Product': c.product,
        'Message': c.message,
        'Submitted Date': c.createdAt ? new Date(c.createdAt).toLocaleString() : ''
      }));

      const productCounts = {};
      exportData.forEach(c => { productCounts[c.product] = (productCounts[c.product] || 0) + 1; });
      const summaryData = [
        { Metric: 'Total Leads', Value: exportData.length },
        { Metric: 'Export Option', Value: exportOption === 'all' ? 'All Data' : `Date Range: ${exportStartDate || 'any'} – ${exportEndDate || 'any'}` },
        { Metric: 'Applied Filters (Product/Search)', Value: `${selectedProduct === 'all' ? 'All Products' : selectedProduct} | Search: ${searchTerm || 'none'}` },
        {},
        { Metric: 'Product Breakdown', Value: '' },
        ...Object.entries(productCounts).map(([p, cnt]) => ({ Metric: p, Value: cnt }))
      ];

      const workbook = XLSX.utils.book_new();
      const mainSheet = XLSX.utils.json_to_sheet(mainSheetData);
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      mainSheet['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 25 }, { wch: 50 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, mainSheet, 'Leads Data');
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      XLSX.writeFile(workbook, `leads_export_${new Date().toISOString().slice(0,19)}.xlsx`);
    } finally {
      setExporting(false);
      setShowExportModal(false);
      setExportStartDate('');
      setExportEndDate('');
      setExportOption('all');
    }
  };

  const importFromExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      alert('Please upload an Excel file (.xlsx, .xls, .csv)');
      return;
    }
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        
        const leads = rows.map(row => ({
          name: row['Name'] || row['Full Name'] || row['name'] || '',
          email: row['Email'] || row['email'] || '',
          phone: row['Phone'] || row['phone'] || '',
          product: row['Product'] || row['product'] || '',
          message: row['Message'] || row['message'] || '',
          createdAt: row['Date'] || row['Submitted Date'] ? new Date(row['Date'] || row['Submitted Date']) : new Date()
        })).filter(lead => lead.name && lead.email);
        
        if (leads.length === 0) {
          alert('No valid leads found in the file.');
          return;
        }
        const response = await api.post('/import-leads', { leads });
        alert(`✅ Imported ${response.data.count} leads successfully!`);
        fetchClients();
      } catch (err) {
        console.error(err);
        alert(`Import failed: ${err.response?.data?.message || err.message}`);
      } finally {
        setImporting(false);
        event.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedProduct('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const getProductCount = (productValue) => {
    if (productValue === 'all') return clients.length;
    return clients.filter(c => c.product?.toLowerCase().includes(productValue.toLowerCase())).length;
  };

  const getBtnColor = (isActive) => {
    const base = 'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 border';
    if (isActive) {
      return `${base} bg-slate-900 border-slate-900 text-white shadow-sm shadow-slate-900/10`;
    }
    return `${base} bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300`;
  };

  const totalLeads = clients.length;
  const thisMonth = clients.filter(c => {
    const date = new Date(c.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const uniqueProducts = [...new Set(clients.map(c => c.product).filter(Boolean))].length;
  const avgLeadsPerDay = totalLeads > 0 ? (totalLeads / 30).toFixed(1) : 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 pt-5 font-sans antialiased">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-5 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 font-medium text-xs uppercase tracking-widest mb-1.5">
                <Activity size={14} className="stroke-[2.5]" />
                <span>Enterprise Suite</span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Lead Registry</h1>
              <p className="text-slate-500 text-sm mt-0.5">Central Hub for incoming business opportunities and pipeline requests.</p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50"
            >
              <ArrowLeft size={16} className="text-slate-500" />
              <span>Back Dashboard</span>
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Stats KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Enquiries', value: totalLeads, icon: Users, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
              { label: 'Monthly Growth', value: thisMonth, icon: Activity, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
              { label: 'Active Channels', value: uniqueProducts, icon: Package, color: 'text-amber-600 bg-amber-50 border-amber-100' },
              { label: 'Conversion Velocity', value: `${avgLeadsPerDay}/d`, icon: Zap, color: 'text-cyan-600 bg-cyan-50 border-cyan-100' }
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                    <p className="text-3xl font-bold tracking-tight text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${stat.color}`}>
                    <stat.icon size={20} className="stroke-[2]" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <div className="relative w-full xl:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Query name, secure email or phone index..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 shadow-sm transition-all"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 self-end xl:self-auto">
              <button
                onClick={() => setShowExportModal(true)}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-emerald-600/10 transition-all disabled:opacity-50"
              >
                <Download size={16} />
                <span>Export Ledger</span>
              </button>
              <label className={`inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-600/10 transition-all cursor-pointer ${importing ? 'opacity-50' : ''}`}>
                {importing ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                <span>{importing ? 'Processing Sheet...' : 'Import Manifest'}</span>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={importFromExcel} disabled={importing} className="hidden" />
              </label>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider min-w-[140px]">
                  <Filter size={14} className="text-slate-400" />
                  <span>Channel Origin</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {productOptions.map((opt) => {
                    const isActive = selectedProduct === opt.value;
                    const count = getProductCount(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedProduct(opt.value)}
                        className={getBtnColor(isActive)}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <opt.icon size={13} className={isActive ? 'text-white' : 'text-slate-400'} />
                          {opt.label}
                        </span>
                        <span className={`ml-2 text-[11px] ${isActive ? 'text-white/80' : 'text-slate-400 font-normal'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="h-px bg-slate-100 w-full" />
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider min-w-[140px]">
                  <Calendar size={14} className="text-slate-400" />
                  <span>Timeline Frame</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                  <span className="text-slate-400 text-xs font-medium">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                  {(startDate || endDate || selectedProduct !== 'all' || searchTerm) && (
                    <button
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-auto md:ml-2"
                    >
                      <X size={13} /> 
                      <span>Remove Filter</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col justify-center items-center h-72 gap-3">
                <Loader className="animate-spin text-slate-800" size={32} />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Syncing database...</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-20">
                <div className="h-14 w-14 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No entries intersect search space</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">Re-evaluate target metrics, clear system filter parameters or insert explicit manifest sheets.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse align-middle">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-3.5 text-left font-bold border-r border-slate-200/60 min-w-[180px]">Lead Name</th>
                        <th className="px-6 py-3.5 text-left font-bold border-r border-slate-200/60 min-w-[240px]">Communication Endpoint</th>
                        <th className="px-6 py-3.5 text-left font-bold border-r border-slate-200/60 min-w-[150px]">Phone Index</th>
                        <th className="px-6 py-3.5 text-left font-bold border-r border-slate-200/60 min-w-[160px]">Target Category</th>
                        <th className="px-6 py-3.5 text-left font-bold border-r border-slate-200/60 min-w-[340px]">Message Context</th>
                        <th className="px-6 py-3.5 text-left font-bold min-w-[140px]">Registry Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 bg-white text-slate-700 text-sm">
                      {paginatedClients.map((client) => (
                        <tr key={client._id} className="hover:bg-slate-50/60 transition-colors duration-150">
                          <td className="px-6 py-4 font-semibold text-slate-900 border-r border-slate-200/60">{client.name}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-600 border-r border-slate-200/60 break-all">{client.email}</td>
                          <td className="px-6 py-4 font-medium text-slate-600 border-r border-slate-200/60">{client.phone || '—'}</td>
                          <td className="px-6 py-4 border-r border-slate-200/60">
                            <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold uppercase tracking-wide border border-slate-200/40">
                              {client.product || 'Standard'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 border-r border-slate-200/60 break-words whitespace-normal max-w-md leading-relaxed">{client.message || 'No remarks provided.'}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-500 whitespace-nowrap">{new Date(client.createdAt).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
                  <div className="text-xs font-medium text-slate-500">
                    Showing <span className="font-bold text-slate-800">{paginatedClients.length}</span> of <span className="font-bold text-slate-800">{filteredClients.length}</span> registry leads
                  </div>
                  {totalPages > 1 && (
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 shadow-sm transition"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <div className="flex items-center gap-1 px-1">
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              currentPage === i + 1
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 shadow-sm transition"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">Compile Ledger Dataset</h2>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="radio"
                    value="all"
                    checked={exportOption === 'all'}
                    onChange={() => setExportOption('all')}
                    className="mt-0.5 text-slate-900 focus:ring-slate-900"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">Complete Database Manifest</span>
                    <span className="block text-xs text-slate-400 mt-0.5">Exports compiled structural entries ignoring dashboard date scopes.</span>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="radio"
                    value="dateRange"
                    checked={exportOption === 'dateRange'}
                    onChange={() => setExportOption('dateRange')}
                    className="mt-0.5 text-slate-900 focus:ring-slate-900"
                  />
                  <div>
                    <span className="block text-sm font-bold text-slate-800">Target Timeframe Segments</span>
                    <span className="block text-xs text-slate-400 mt-0.5">Filter criteria down to definitive corporate quarters or timeline nodes.</span>
                  </div>
                </label>
              </div>
              {exportOption === 'dateRange' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Start Point</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">End Point</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Abort
                </button>
                <button
                  onClick={exportToExcel}
                  disabled={exporting}
                  className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {exporting ? <Loader size={16} className="animate-spin mx-auto" /> : 'Confirm Transmit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentPage;