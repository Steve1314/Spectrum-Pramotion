import React, { useState, useEffect } from 'react';
import {
  DollarSign, Calculator, FileText, BarChart2,
  MapPin, ChevronDown, ChevronUp, X,
  Wifi, Smartphone, Monitor, Phone, Info,
  Settings, Check, Send, AlertCircle, ShoppingCart,
  CheckCircle2, Plus, Minus, ArrowLeft, Lock, User,
  Copy, ClipboardCheck, Trash2, FileEdit, ClipboardList, Tag, HelpCircle
} from 'lucide-react';
import { db, auth } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import './App.css';

const SpectrumLogo = ({ isDarkBg = false, showBusiness = true }) => {
  const textColor = isDarkBg ? 'white' : '#00629b';
  return (
    <div className="flex flex-col select-none cursor-pointer">
      <div className="flex items-center" style={{ marginBottom: showBusiness ? '-6px' : '0' }}>
        <span style={{
          fontSize: '42px',
          fontWeight: 'bold',
          color: textColor,
          letterSpacing: '-1.5px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          lineHeight: 1
        }}>Spectrum</span>
        <svg width="15" height="20" viewBox="0 0 10 10" style={{ marginLeft: '1px', marginTop: '3px' }}>
          <polygon points="0,0 10,5 0,10" fill="#0099d8" />
        </svg>
      </div>
      {showBusiness && (
        <span style={{
          fontSize: '11px',
          fontWeight: '300',
          color: textColor,
          letterSpacing: '2.5px',
          paddingLeft: '2px',
          fontFamily: 'Helvetica, Arial, sans-serif',
          lineHeight: 1
        }}>BUSINESS</span>
      )}
    </div>
  );
};

function App() {
  // CONFIGURATION: Replace this with your Cloudflare Worker URL when ready
  const PROD_API_URL = 'https://fancy-credit-d78e.vivu6164.workers.dev'; 
  const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? '/spectrum-api' 
    : (PROD_API_URL || '/spectrum-api');

  // Navigation State
  const [viewState, setViewState] = useState('landing');

  // Developer Setup States
  const [token, setToken] = useState(localStorage.getItem('spectrum_direct_token') || '');

  // Admin States
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Address States
  const [address, setAddress] = useState('8449 Halls Ferry Rd');
  const [apt, setApt] = useState('');
  const [zip, setZip] = useState('63147');

  // App States
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeSections, setActiveSections] = useState({
    gis: true,
    resources: true,
    notifications: true,
    builder: true
  });

  // Multi-Match State
  const [multiMatchData, setMultiMatchData] = useState(null);
  const [addressSearch, setAddressSearch] = useState('');
  const [pendingAutoCheck, setPendingAutoCheck] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copySnapshot, setCopySnapshot] = useState('');
  const [locationKey, setLocationKey] = useState('');

  // Bundle Selector States
  const [selectedServices, setSelectedServices] = useState({
    internet: [],
    mobile: [],
    tv: [],
    voice: []
  });

  // Service Customization States
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [customizationServices, setCustomizationServices] = useState({
    internet: null,
    equipment: [],
    additionalServices: [],
    tv: [],
    mobile: false,
    voice: false
  });

  // Modal States
  const [modalContent, setModalContent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Persistence & Real-time Token Sync
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'spectrum'), (docSnap) => {
      if (docSnap.exists()) {
        const remoteToken = docSnap.data().token;
        if (remoteToken && remoteToken !== token) {
          console.log('Token updated from Firebase');
          setToken(remoteToken);
          localStorage.setItem('spectrum_direct_token', remoteToken);
        }
      }
    });
    return () => unsub();
  }, [token]);

  useEffect(() => {
    localStorage.setItem('spectrum_direct_token', token);
  }, [token]);

  useEffect(() => {
    if (pendingAutoCheck && viewState === 'landing') {
      setPendingAutoCheck(false);
      runTest();
    }
  }, [pendingAutoCheck, viewState]);

  const toggleSection = (section) => {
    setActiveSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleServiceChange = (category, value) => {
    setSelectedServices(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const fetchModal = async (type) => {
    setLoading(true);
    let url = '';
    if (type === 'disclaims') {
      url = `${API_BASE}/checkout/x-ref/disclaimers-modal/_jcr_content/root/responsivegrid/responsivegrid.model.json`;
    } else {
      url = `${API_BASE}/content/spectrum/buyflow-business/en/xref-global/broadband-label-modal/_jcr_content/root/responsivegrid/responsivegrid_141585965.model.json`;
    }

    try {
      const resp = await fetch(url);
      const data = await resp.json();

      let content = '';
      let title = '';

      if (type === 'disclaims') {
        const modalItem = data[':items']?.modal;
        title = modalItem?.headerTitle || 'Pricing Information';
        content = modalItem?.richtext || '';
      } else {
        const modalItem = data[':items']?.modal;
        const textItem = modalItem?.[':items']?.responsivegrid?.[':items']?.text;
        title = 'Broadband Label';
        content = textItem?.text || '';
      }

      setModalContent({ title, content });
      setShowModal(true);
    } catch (err) {
      console.error('Modal fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runTest = async () => {
    if (!token) {
      setError('System is currently offline or unauthorized. Please contact administrator.');
      return;
    }

    setLoading(true);
    setError(null);

    const requestBody = {
      addressInformation: {
        line1: address,
        ...(apt ? { line2: apt } : {}),
        postalCode: zip,
        ...(locationKey ? { locationKey: locationKey } : {})
      },
      channelInformation: {
        affiliateId: "218739",
        channel: "SMB-CP",
        customerPresent: false,
        barRestaurant: false,
        evo: "",
        originatingFlowId: "SBCHPTNRC",
        salesAgentId: "60542/IBS01162",
        salesAgentEmail: "admin@vahlayconsulting.com"
      },
      fetchOffers: true,
      offerType: "C"
    };

    try {
      const resp = await fetch(
        `${API_BASE}/services/spectrum/serviceability/proxy.api/serviceability-wrapper/v2/offers/address?returnSessionInfo=true&system=CSS`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'client-id': 'aem_buyflow',
            'channel': 'SMB-CP',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || `API Error: ${resp.status}`);

      if (data.reasonInfo?.reasonCode === "120") {
        setMultiMatchData(data);
        setViewState('address-selection');
        setLoading(false);
        return;
      }

      const isEligible = data.eligibleForOffers !== false;

      setResult({
        success: true,
        eligible: isEligible,
        sessionInfo: data.sessionInfo,
        gisRecommendationData: data.gisRecommendationData,
        reasonInfo: data.reasonInfo,
        offers: data.offers?.map(offer => {
          const internetProduct = (offer.product || []).find(p => p.lineOfBusiness === 'Internet');
          const promoDuration = internetProduct?.pricing?.discountTerm || null;
          const price = offer.pricing?.displayPrice ?? offer.pricing?.netPrice ?? 0;
          let bannerText = null;
          if (offer.group === 'SMB Free Internet') {
            bannerText = null;
          } else if (promoDuration >= 24) {
            bannerText = `${Math.floor(promoDuration / 12)}-Year Price Guarantee`;
          }

          return {
            id: offer.id,
            name: offer.name,
            speed: offer.internetSpeedText || '',
            lobs: offer.lineOfBusiness || [],
            price: price,
            priceType: offer.pricing?.displayPriceType || 'with Auto Pay',
            group: offer.group || '',
            banner: bannerText,
            promoDuration: promoDuration,
            isFreeInternet: offer.group === 'SMB Free Internet',
          };
        }) || [],
      });

      setViewState('portal');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyAllSuites = () => {
    const list = (multiMatchData?.addressList || [])
      .map(addr => addr.line2 || 'N/A')
      .join('\n');
    navigator.clipboard.writeText(list);
    setCopySnapshot(list);
    setCopySuccess(true);
    setTimeout(() => {
      setCopySuccess(false);
      setCopySnapshot('');
    }, 2500);
  };

  const handleAddressSelect = (addr) => {
    // Force line2 to be empty string if it's missing or says "N/A"
    const suite = addr.line2 && addr.line2 !== 'N/A' ? addr.line2 : '';
    
    setAddress(addr.line1);
    setApt(suite);
    setZip(addr.postalCode);
    setLocationKey(addr.locationKey || '');
    setMultiMatchData(null);
    setAddressSearch('');
    
    // Move to landing and trigger the check
    setViewState('landing');
    setPendingAutoCheck(true);
  };

  const handleEditLocation = () => {
    setLocationKey('');
    setViewState('landing');
  };

  const handlePlanSelect = (offer) => {
    setSelectedPlan(offer);
    setCustomizationServices({
      internet: offer.name,
      equipment: [],
      additionalServices: [],
      tv: [],
      mobile: false,
      voice: false
    });
    setViewState('service-customization');
  };

  const handleServiceToggle = (service, category = 'additionalServices') => {
    setCustomizationServices(prev => {
      if (category === 'additionalServices' || category === 'equipment' || category === 'tv') {
        const currentList = prev[category];
        const updated = currentList.includes(service)
          ? currentList.filter(s => s !== service)
          : [...currentList, service];
        return { ...prev, [category]: updated };
      } else {
        return { ...prev, [category]: !prev[category] };
      }
    });
  };

  const calculateCustomizationPrice = () => {
    if (!selectedPlan) return selectedPlan?.price || 0;
    let basePrice = parseFloat(selectedPlan.price);
    let additionalPrice = 0;
    if (customizationServices.equipment.includes('advanced-modem')) additionalPrice += 10;
    if (customizationServices.equipment.includes('wifi-pods')) additionalPrice += 15;
    if (customizationServices.additionalServices.includes('cloud-dvr')) additionalPrice += 20;
    if (customizationServices.additionalServices.includes('security')) additionalPrice += 14;
    if (customizationServices.additionalServices.includes('phone-support')) additionalPrice += 9;
    if (customizationServices.tv.includes('tv-prem')) additionalPrice += 40;
    if (customizationServices.tv.includes('tv-stream')) additionalPrice += 30;
    if (customizationServices.mobile) additionalPrice += 25;
    if (customizationServices.voice) additionalPrice += 35;
    return (basePrice + additionalPrice).toFixed(2);
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const email = adminEmail.trim().toLowerCase();
    const pass = adminPassword.trim();
    if (email === 'admin@vahlayconsulting.com' && pass === 'Vahlay@2025') {
      setIsAdminLoggedIn(true);
      setViewState('admin-dashboard');
      setAdminError('');
    } else {
      setAdminError('Invalid email or password. Please try again.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setViewState('landing');
    setAdminEmail('');
    setAdminPassword('');
  };

  const updateGlobalToken = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'spectrum'), {
        token: token,
        updatedAt: new Date().toISOString()
      });
      alert('Global token updated successfully across all users!');
    } catch (err) {
      console.error('Error updating global token:', err);
      alert('Failed to update global token in Firestore.');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions to get GIS data from API response
  const getGisRecommendationText = () => {
    if (result?.gisRecommendationData?.gisRecommendationText) {
      return result.gisRecommendationData.gisRecommendationText;
    }
    if (result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationText) {
      return result.sessionInfo.serviceAddress.gisRecommendationData.gisRecommendationText;
    }
    return 'Proximity to Neighbors';
  };

  const getGisRecommendationColor = () => {
    if (result?.gisRecommendationData?.gisRecommendationColor) {
      return result.gisRecommendationData.gisRecommendationColor;
    }
    if (result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationColor) {
      return result.sessionInfo.serviceAddress.gisRecommendationData.gisRecommendationColor;
    }
    return 'YELLOW';
  };

  const getGisRecommendationReason = () => {
    if (result?.gisRecommendationData?.gisRecommendationReason) {
      return result.gisRecommendationData.gisRecommendationReason;
    }
    if (result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationReason) {
      return result.sessionInfo.serviceAddress.gisRecommendationData.gisRecommendationReason;
    }
    return 'Address requires serviceability survey.';
  };

  const getGisAddressLine = () => {
    if (result?.gisRecommendationData?.gisAddressLine) {
      return result.gisRecommendationData.gisAddressLine;
    }
    if (result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisAddressLine) {
      return result.sessionInfo.serviceAddress.gisRecommendationData.gisAddressLine;
    }
    return address.toUpperCase();
  };

  const getGisLatitude = () => {
    if (result?.gisRecommendationData?.gisLatitude) {
      return result.gisRecommendationData.gisLatitude;
    }
    if (result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisLatitude) {
      return result.sessionInfo.serviceAddress.gisRecommendationData.gisLatitude;
    }
    return null;
  };

  const getGisLongitude = () => {
    if (result?.gisRecommendationData?.gisLongitude) {
      return result.gisRecommendationData.gisLongitude;
    }
    if (result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisLongitude) {
      return result.sessionInfo.serviceAddress.gisRecommendationData.gisLongitude;
    }
    return null;
  };

  const getUspsConfirmationCode = () => {
    if (result?.gisRecommendationData?.gisUSPSDPVConfirmationCode) {
      return result.gisRecommendationData.gisUSPSDPVConfirmationCode;
    }
    if (result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisUSPSDPVConfirmationCode) {
      return result.sessionInfo.serviceAddress.gisRecommendationData.gisUSPSDPVConfirmationCode;
    }
    return 'N';
  };

  const getReasonCodeDescription = () => {
    if (result?.reasonInfo?.reasonDescription) {
      return result.reasonInfo.reasonDescription;
    }
    return 'Serviceable Match';
  };

  const getConnectionType = () => {
    if (result?.sessionInfo?.serviceAddress?.connectionType) {
      return result.sessionInfo.serviceAddress.connectionType;
    }
    return 'Coax';
  };

  const isMobileEligible = () => {
    if (result?.sessionInfo?.serviceAddress?.serviceability?.mobileEligible) {
      return result.sessionInfo.serviceAddress.serviceability.mobileEligible;
    }
    return false;
  };

  const getReasonCode = () => {
    if (result?.reasonInfo?.reasonCode) {
      return result.reasonInfo.reasonCode;
    }
    return '100';
  };

  // Get color based on GIS recommendation color using custom colors
  const getColorByRecommendation = (colorCode) => {
    switch (colorCode?.toUpperCase()) {
      case 'GREEN': return '#028400ff';
      case 'YELLOW': return '#d1bc02ff';
      case 'RED': return '#000000ff';
      default: return '#64748b';
    }
  };

  return (
    <div className="spectrum-app">
      <header className="main-header">
        <div className="logo-container">
          <div onClick={() => setViewState('landing')} className="header-brand-group">
            <SpectrumLogo isDarkBg={true} showBusiness={false} />
            <div className="header-portal-title">
              Retail Portal v1.0.0.8
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={() => setViewState('admin-login')} className="settings-btn">
            <Lock size={20} />
          </button>
        </div>
      </header>

      {viewState === 'landing' ? (
        <div className="landing-view animate-in">
          <h1 className="get-started-title">Get Started</h1>
          <div className="localization-card">
            <h2>Business Information</h2>
            <p>Enter the business address to get the most accurate information, as services and rates vary by location.</p>
            <div className="form-group">
              <label>Business street address</label>
              <input
                type="text"
                placeholder="e.g., 8449 Halls Ferry RoadSt."
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
              {address.length > 5 && <CheckCircle2 size={16} className="valid-icon" />}
            </div>
            <div className="form-group">
              <label>Suite/floor #</label>
              <input
                type="text"
                placeholder="Suite/floor #"
                value={apt}
                onChange={e => setApt(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>ZIP Code</label>
              <input
                type="text"
                placeholder="63147"
                maxLength={5}
                value={zip}
                onChange={e => setZip(e.target.value)}
              />
              {zip.length === 5 && <CheckCircle2 size={16} className="valid-icon" />}
            </div>
            {error && <div className="text-red-600 text-sm mb-4 p-2 bg-red-50 border-l-2 border-red-600">{error}</div>}
            <button className="btn-check" onClick={runTest} disabled={loading || !address || !zip}>
              {loading ? 'Checking Availability...' : 'CHECK AVAILABILITY'}
            </button>
          </div>
        </div>
      ) : viewState === 'address-selection' ? (
        <div className="address-selection-view animate-in">
          <h1 className="as-title">Please select the suite/floor #</h1>
          <div className="as-current-address" onClick={() => setViewState('landing')}>
            <MapPin size={22} />
            <span>{address?.toLowerCase()}, {zip.slice(0, 5)}</span>
          </div>
          <p className="as-description">There are multiple units at this location. Please add the suite/floor # of the business below.</p>
          <div className="as-search-container">
            <div className="flex justify-between items-end mb-2">
              <label className="as-search-label !mb-0">Suite/floor #</label>
              <button className={`as-copy-btn ${copySuccess ? 'success' : ''}`} onClick={copyAllSuites} title="Copy all suites to clipboard">
                {copySuccess ? <ClipboardCheck size={14} /> : <Copy size={14} />}
                {copySuccess ? 'Copied!' : 'Copy All'}
              </button>
            </div>
            <input type="text" className="as-search-input" placeholder="Filter suites..." value={addressSearch} onChange={e => setAddressSearch(e.target.value)} />
          </div>
          <div className="as-list">
            {(multiMatchData?.addressList || [])
              .filter(addr => !addressSearch || (addr.line2 || 'n/a').toLowerCase().includes(addressSearch.toLowerCase()))
              .map((addr, idx) => (
                <div key={idx} className="as-item" onClick={() => handleAddressSelect(addr)}>
                  {addr.line2 || <span className="as-item-na">N/A</span>}
                </div>
              ))}
          </div>
          <div className="as-back-link" onClick={() => setViewState('landing')}>
            <X size={14} /> Cancel and start over
          </div>
          {copySuccess && (
            <div className="copy-snapshot-overlay animate-in">
              <div className="snapshot-header"><ClipboardCheck size={18} /><span>Copied to Clipboard</span></div>
              <div className="snapshot-body">{copySnapshot.split('\n').map((line, idx) => (<div key={idx} className="snapshot-line">{line}</div>))}</div>
              <div className="snapshot-footer">{copySnapshot.split('\n').length} units captured</div>
            </div>
          )}
        </div>
      ) : viewState === 'admin-login' ? (
        <div className="admin-login-view animate-in">
          <div className="admin-login-card">
            <form onSubmit={handleAdminLogin}>
              <div className="admin-form-group"><label><User size={14} className="inline mr-2" />Email Address</label><input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@vahlayconsulting.com" required /></div>
              <div className="admin-form-group"><label><Lock size={14} className="inline mr-2" />Password</label><input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" required /></div>
              {adminError && <div className="admin-error-msg">{adminError}</div>}
              <button type="submit" className="admin-btn-primary">LOGIN</button>
            </form>
          </div>
        </div>
      ) : viewState === 'admin-dashboard' ? (
        <div className="admin-dashboard-view animate-in">

          <main className="dashboard-main">
            <div className="dashboard-grid">
              <div className="dashboard-card main-config shadow-premium">
                <div className="card-header"><div className="icon-box"><Settings size={24} /></div><div><h3>Master Configuration</h3><p>Global Spectrum JWT Authorizations</p></div></div>
                <div className="card-body">
                  <div className="security-alert"><Lock size={18} /><span>Secure End-to-End Encryption Enabled</span></div>
                  <div className="token-editor-container">
                    <div className="flex justify-between items-center mb-4"><label>Bearer Token</label><span className={`status-pill ${token ? 'valid' : 'invalid'}`}>{token ? 'ACTIVE' : 'MISSING'}</span></div>
                    <div className="textarea-wrapper"><textarea placeholder="Enter direct Spectrum JWT token here..." value={token} onChange={e => setToken(e.target.value)} rows={12} className="custom-scrollbar" /><div className="char-count">{token.length.toLocaleString()} characters</div></div>
                    <div className="action-footer"><div className="sync-info"><Info size={14} />Syncs to all user instances automatically</div><button onClick={updateGlobalToken} className="btn-sync-premium" disabled={loading}>{loading ? (<div className="flex items-center gap-2"><div className="spinner-small"></div>SYNCHRONIZING...</div>) : (<div className="flex items-center gap-2"><Send size={18} />UPDATE GLOBAL TOKEN</div>)}</button></div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <div className="dashboard-card status-overview shadow-premium"><div className="card-header-compact"><h3>System Connectivity</h3></div><div className="card-body-compact"><div className="connectivity-list"><div className="conn-item"><div className="conn-status online"></div><div className="conn-label">Firestore DB</div><div className="conn-val">Connected</div></div><div className="conn-item"><div className={`conn-status ${token ? 'online' : 'error'}`}></div><div className="conn-label">API Authorization</div><div className="conn-val">{token ? 'Authorized' : 'Pending'}</div></div><div className="conn-item"><div className="conn-status online"></div><div className="conn-label">Sync Service</div><div className="conn-val">Broadcasting</div></div></div></div></div>
                <div className="dashboard-card info-card shadow-premium"><div className="card-header-compact"><h3>Help & Support</h3></div><div className="card-body-compact"><p className="text-sm text-dim mb-4">If the token expires, paste the new JWT obtained from Spectrum's buyflow into the Master Configuration box.</p><div className="support-link"><FileText size={16} /><span>Documentation</span></div></div></div>
              </div>
            </div>
          </main>
        </div>
      ) : (
        <div className="portal-view animate-in">
          <main className="page-container">
            {result && result.eligible === false ? (
              <div className="out-of-footprint">
                <h1 className="oof-title">Spectrum Business does not<br />provide service in this area</h1>
                <div className="oof-address-block"><div className="oof-address">{address}{apt ? ' ' + apt : ''}, {zip.slice(0, 5)}</div><div className="oof-subtitle">Is this the right address?</div></div>
                <button className="oof-start-over-btn" onClick={handleEditLocation}>START OVER</button>
                <div className="oof-help-text">If the address is entered correctly,<br />we'll help <span className="oof-link">find a provider</span> for that area.</div>
                <div className="oof-call-text">To place an order, please call <span>1.833.809.4002</span></div>
              </div>
            ) : (
              <>
                <h1 className="page-title">
                  Choose Services
                  <div className="location-info-right" onClick={handleEditLocation}>
                    <MapPin size={18} className="mr-2" />
                    <span className="underline">{address}{apt ? ' ' + apt : ''}, {zip.slice(0, 5)}</span>
                  </div>
                </h1>

                {/* GIS Overview - Shows actual API data "Proximity to Neighbors" */}
                <section tabIndex={0}>
                  <div className="section-header" onClick={() => toggleSection('gis')}>
                    <div className="flex items-center gap-2">
                      <h3 className="m-0">GIS Overview</h3>
                      <span
                        className="gis-badge gis-recommendation-badge"
                        style={{
                          backgroundColor: `${getColorByRecommendation(getGisRecommendationColor())}20`,
                          color: getColorByRecommendation(getGisRecommendationColor()),
                          borderColor: getColorByRecommendation(getGisRecommendationColor())
                        }}
                      >
                        {getGisRecommendationText()}
                      </span>
                    </div>
                    {activeSections.gis ? <ChevronUp size={20} /> : <ChevronDown size={20} />}



                  </div>
                  {activeSections.gis && (
                    <div className="section-content animate-in !pt-0">
                      <div
                        className="gis-recommendation-banner"
                        style={{
                          backgroundColor: `${getColorByRecommendation(getGisRecommendationColor())}10`,
                          borderLeftColor: getColorByRecommendation(getGisRecommendationColor())
                        }}
                      >

                        <div className="gis-recommendation-content">


                        </div>
                      </div>

                      <table className="gis-table">
                        <tbody>
                          <tr>
                            <td>GIS Recommendation Color</td>
                            <td>
                              <span
                                className="gis-color-badge"
                                style={{
                                  backgroundColor: `${getColorByRecommendation(getGisRecommendationColor())}20`,
                                  color: getColorByRecommendation(getGisRecommendationColor())
                                }}
                              >
                                {getGisRecommendationColor()}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>GIS Recommendation</td>
                            <td className="font-semibold" style={{ color: getColorByRecommendation(getGisRecommendationColor()) }}>
                              {getGisRecommendationText()}
                            </td>
                          </tr>
                          <tr>
                            <td>GIS Recommendation Reason</td>
                            <td>{getGisRecommendationReason()}</td>
                          </tr>
                          <tr>
                            <td>C A S S Address</td>
                            <td>{getGisAddressLine()}</td>
                          </tr>
                          <tr>
                            <td>GPS Coordinates</td>
                            <td>
                              {getGisLatitude() && getGisLongitude()
                                ? `${getGisLatitude()}, ${getGisLongitude()}`
                                : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td>USPS DPV Confirmation</td>
                            <td>
                              <span className={`usps-badge ${getUspsConfirmationCode() === 'Y' ? 'verified' : 'unverified'}`}>
                                {getUspsConfirmationCode()}
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td>Reason Code</td>
                            <td>{getReasonCode()} - {getReasonCodeDescription()}</td>
                          </tr>
                          <tr>
                            <td>Hookup Type</td>
                            <td>{getConnectionType()}</td>
                          </tr>
                          <tr>
                            <td>Mobile</td>
                            <td>{isMobileEligible() ? 'Yes' : 'No'}</td>
                          </tr>
                          <tr>
                            <td>Business Validation Check</td>
                            <td>Yes</td>
                          </tr>
                        </tbody>
                      </table>

                      {result?.sessionInfo?.serviceAddress?.programs?.includes('HighSplitSymmetrical') && (
                        <div className="mt-4 p-2 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded flex items-center gap-2">
                          <Monitor size={14} /> Symmetrical Speeds Available via High-Split Infrastructure
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Resources */}
                <section tabIndex={0}>
                  <div className="section-header" onClick={() => toggleSection('resources')}>
                    <div className="flex flex-col"><h3>Resources</h3><p className="section-subtitle">Sales tools and reports</p></div>
                    {activeSections.resources ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  {activeSections.resources && (
                    <div className="section-content resource-grid animate-in">
                      <div className="resource-card"><div className="resource-icon-box"><DollarSign size={24} /></div><span>Pricing</span></div>
                      <div className="resource-card"><div className="resource-icon-box"><Calculator size={24} /></div><span>Mobile Calculator</span></div>
                      <div className="resource-card"><div className="resource-icon-box"><ClipboardList size={24} /></div><span>O2</span></div>
                      <div className="resource-card"><div className="resource-icon-box"><FileText size={24} /></div><span>Sales Quote</span></div>
                    </div>
                  )}
                </section>

                {/* Notifications */}
                <section tabIndex={0}>
                  <div className="section-header" onClick={() => toggleSection('notifications')}>
                    <h3>Notifications</h3>
                    {activeSections.notifications ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  {activeSections.notifications && (
                    <div className="section-content animate-in">
                      <div className="mb-2 text-xs text-dim">Last updated on 04/07/2026</div>
                      <div className="notification-box">
                        <h4>Latest Updates</h4>
                        <ul className="bullet-list !mb-0">
                          <li><b>Fiber-Powered:</b> Spectrum offers high-speed Fiber-Powered services for reliable connections (uses an advanced hybrid coaxial fiber network).</li>
                          <li><b>Invincible WiFi:</b> Advanced WiFi plus 5G and battery backup for seamless connectivity during unexpected outages. <span className="text-blue-600 underline cursor-pointer ml-1">WiFi Pods details</span></li>
                          <li><b>Special Internet Offer:</b> New customers can get Spectrum Business Internet® Advantage free forever when they add 4 Spectrum Mobile® Unlimited lines (at least 2 must be ported; can be combined with Phone Balance Buyout program). Customers can upgrade to faster speeds with Internet Premier for an additional <b>+$20</b>, Ultra at <b>+$50</b>, Gig at <b>+$70</b>, and 2 Gig at <b>+$120</b>. <span className="text-blue-600 underline cursor-pointer ml-1">Details</span></li>
                          <li><b>Cloud DVR Unlimited:</b> Get unlimited recordings of your favorite shows to watch on any device, anywhere through the Spectrum TV® App for $20/mo. Spectrum Internet® and TV required.</li>
                          <li><b>Combine & Save:</b> New bundled offers are live, providing discounted rates and 2- or 3-year price guarantees when combining Internet with other services.</li>
                          <li><b>Broadband Label:</b> Access and email Broadband Label information to customers upon request. <span className="text-blue-600 underline cursor-pointer ml-1" onClick={() => fetchModal('broadband')}>View</span></li>
                          <li><b>Auto Pay Discount:</b> Receive a $10 monthly discount with Auto Pay enrollment. Payment must be set up on our self-service site within the first 30 days to preserve discount.</li>
                          <li><b>Xumo Stream Box:</b> Customer is eligible to add Xumo Stream Box for $5/mo per device, limit is 20 per account.</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </section>

                {/* Build a Bundle Builder */}
                <section tabIndex={0}>
                  <div className="section-header border-none"><h3 className="text-2xl pt-8">Build a Bundle</h3></div>
                  <p className="text-xs text-blue-600 underline mb-4 cursor-pointer">See additional product details</p>
                  <div className="bundle-grid">
                    <div className="bundle-column"><h4>INTERNET</h4><div className="text-[10px] text-dim mb-2">(Select up to 3 options)</div>
                      <div className="bundle-option"><input type="checkbox" id="int-adv" checked={selectedServices.internet.includes('advantage')} onChange={() => handleServiceChange('internet', 'advantage')} /><label htmlFor="int-adv"><div>BUSINESS INTERNET ADVANTAGE</div><div className="subtext">Up to 100 Mbps</div></label></div>
                      <div className="bundle-option"><input type="checkbox" id="int-prem" checked={selectedServices.internet.includes('premier')} onChange={() => handleServiceChange('internet', 'premier')} /><label htmlFor="int-prem"><div>BUSINESS INTERNET PREMIER</div><div className="subtext">Up to 500 Mbps</div></label></div>
                      <div className="bundle-option"><input type="checkbox" id="int-ultra" checked={selectedServices.internet.includes('ultra')} onChange={() => handleServiceChange('internet', 'ultra')} /><label htmlFor="int-ultra"><div>BUSINESS INTERNET ULTRA</div><div className="subtext">Up to 750 Mbps</div></label></div>
                      <div className="bundle-option"><input type="checkbox" id="int-gig" checked={selectedServices.internet.includes('gig')} onChange={() => handleServiceChange('internet', 'gig')} /><label htmlFor="int-gig"><div>BUSINESS INTERNET GIG</div><div className="subtext">Up to 1 Gbps</div></label></div>
                      <div className="bundle-option"><input type="checkbox" id="int-2gig" checked={selectedServices.internet.includes('2 gig')} onChange={() => handleServiceChange('internet', '2 gig')} /><label htmlFor="int-2gig"><div>BUSINESS INTERNET 2 GIG</div><div className="subtext">Up to 2 Gbps</div></label></div>
                    </div>
                    <div className="bundle-column"><h4>MOBILE</h4><div className="text-[10px] text-dim mb-2">(Select up to 1 option)</div>
                      <div className="bundle-option"><input type="checkbox" id="mob-1" checked={selectedServices.mobile.includes('mobile')} onChange={() => handleServiceChange('mobile', 'mobile')} /><label htmlFor="mob-1"><div>MOBILE</div><div className="subtext">Unlimited Nationwide 5G Coverage</div></label></div>
                    </div>
                    <div className="bundle-column"><h4>TV</h4><div className="text-[10px] text-dim mb-2">(Select up to 2 options)</div>
                      <div className="bundle-option"><input type="checkbox" id="tv-stream-latino" checked={selectedServices.tv.includes('tv-latino')} onChange={() => handleServiceChange('tv', 'tv-latino')} /><label htmlFor="tv-stream-latino"><div>BUSINESS TV STREAM LATINO</div><div className="subtext">45+ channels</div></label></div>
                      <div className="bundle-option"><input type="checkbox" id="tv-bus" checked={selectedServices.tv.includes('tv-bus')} onChange={() => handleServiceChange('tv', 'tv-bus')} /><label htmlFor="tv-bus"><div>BUSINESS TV</div><div className="subtext">50+ channels</div></label></div>
                      <div className="bundle-option"><input type="checkbox" id="tv-stream" checked={selectedServices.tv.includes('tv-stream')} onChange={() => handleServiceChange('tv', 'tv-stream')} /><label htmlFor="tv-stream"><div>BUSINESS TV STREAM</div><div className="subtext">70+ channels</div></label></div>
                      <div className="bundle-option"><input type="checkbox" id="tv-prem" checked={selectedServices.tv.includes('tv-prem')} onChange={() => handleServiceChange('tv', 'tv-prem')} /><label htmlFor="tv-prem"><div>BUSINESS TV PREMIER</div><div className="subtext">90+ channels</div></label></div>
                    </div>
                    <div className="bundle-column"><h4>COMMUNICATIONS</h4><div className="text-[10px] text-dim mb-2">(Select up to 2 options)</div>
                      <div className="bundle-option"><input type="checkbox" id="comm-voice" checked={selectedServices.voice.includes('business-voice')} onChange={() => handleServiceChange('voice', 'business-voice')} /><label htmlFor="comm-voice"><div>BUSINESS VOICE</div><div className="subtext">Cloud & landline Communications</div></label></div>
                      <div className="bundle-option"><input type="checkbox" id="comm-conn" checked={selectedServices.voice.includes('business-connect')} onChange={() => handleServiceChange('voice', 'business-connect')} /><label htmlFor="comm-conn"><div>BUSINESS CONNECT</div><div className="subtext">All-in-one business communications</div></label></div>
                    </div>
                  </div>
                  <div className="bundle-actions"><button className="btn-reset" onClick={() => setSelectedServices({ internet: [], mobile: [], tv: [], voice: [] })}>RESET</button><button className="btn-apply" onClick={runTest}>APPLY</button></div>
                </section>

                {/* Plans List */}
                {result && (
                  <div className="animate-in pb-20">
                    {(() => {
                      const selectedLOBs = [];
                      if (selectedServices.internet.length > 0) selectedLOBs.push('Internet');
                      if (selectedServices.mobile.length > 0) selectedLOBs.push('Mobile');
                      if (selectedServices.tv.length > 0) selectedLOBs.push('TV');
                      if (selectedServices.voice.length > 0) selectedLOBs.push('Phone');

                      let filtered = result.offers.filter(offer => {
                        const hasSelectedLOBs = selectedLOBs.every(lob => offer.lobs.includes(lob));
                        const hasNoExtraLOBs = offer.lobs.length === selectedLOBs.length;
                        if (!hasSelectedLOBs || !hasNoExtraLOBs) return false;
                        if (selectedServices.internet.length > 0) {
                          const nameMatchesTier = selectedServices.internet.some(tier => {
                            const cleanTier = tier.replace('BUSINESS INTERNET ', '').toLowerCase();
                            return offer.name.toLowerCase().includes(cleanTier);
                          });
                          if (!nameMatchesTier) return false;
                        }
                        return true;
                      });

                      const uniqueMap = new Map();
                      filtered.forEach(offer => {
                        const key = `${offer.name}-${offer.speed}-${offer.price}`;
                        if (!uniqueMap.has(key)) uniqueMap.set(key, offer);
                      });
                      filtered = Array.from(uniqueMap.values());

                      if (selectedLOBs.length === 0) {
                        return <div className="plans-header text-center !mt-10 opacity-50">Please select services above to see available plans.</div>;
                      }

                      return (
                        <>
                          <div className="plans-header">{filtered.length} PLANS</div>
                          <div className="plans-grid">
                            {filtered.map((offer, idx) => (
                              <div key={idx} className="plan-card" onClick={() => handlePlanSelect(offer)}>
                                {offer.banner ? <div className="plan-banner">{offer.banner}</div> : <div className="plan-banner" style={{ visibility: 'hidden' }}>‌</div>}
                                <div className="plan-body">
                                  <div className="plan-header-row">
                                    {(() => {
                                      const parts = [];
                                      const name = offer.name?.toLowerCase() || '';
                                      if (offer.lobs.includes('Internet')) {
                                        if (name.includes('2 gig')) parts.push('BUSINESS INTERNET 2 GIG');
                                        else if (name.includes('gig')) parts.push('BUSINESS INTERNET GIG');
                                        else if (name.includes('ultra')) parts.push('BUSINESS INTERNET ULTRA');
                                        else if (name.includes('premier')) parts.push('BUSINESS INTERNET PREMIER');
                                        else if (name.includes('advantage')) parts.push('BUSINESS INTERNET ADVANTAGE');
                                        else parts.push('BUSINESS INTERNET');
                                      }
                                      if (offer.lobs.includes('Phone') || offer.lobs.includes('Voice')) parts.push('BUSINESS VOICE');
                                      if (offer.lobs.includes('TV')) parts.push('BUSINESS TV');
                                      if (offer.lobs.includes('Mobile')) parts.push('BUSINESS MOBILE');
                                      return <h4 className="plan-title">{parts.join(' + ')}</h4>;
                                    })()}
                                    <div className="plan-toggle"></div>
                                  </div>
                                  <div className="plan-speed">{offer.speed?.replace(/up to\s+/gi, '')} | 35+ Calling Features (Paid)</div>
                                  <ul className="plan-features">
                                    {offer.lobs?.includes('Internet') && (() => {
                                      const n = offer.name?.toLowerCase() || '';
                                      const spd = offer.speed?.replace(/up to\s+/gi, '') || '';
                                      let desc;
                                      if (n.includes('2 gig')) desc = `Maximum performance for the most bandwidth-intensive applications with speeds up to ${spd}`;
                                      else if (n.includes('gig')) desc = `Ideal for connected office spaces and high-performance users with speeds up to ${spd}`;
                                      else if (n.includes('ultra')) desc = `Good for e-commerce, file sharing and cloud-based applications with speeds up to ${spd}`;
                                      else if (n.includes('premier')) desc = `Reliable Internet for web browsing, email and casual online tasks with speeds up to ${spd}`;
                                      else if (n.includes('advantage')) desc = `Ideal for basic business tasks and light web browsing with speeds up to ${spd}`;
                                      else desc = `Business Internet with speeds up to ${spd}`;
                                      return <li>{desc}</li>;
                                    })()}
                                    {offer.lobs?.includes('Phone') && <li>Business phone with unlimited local and long-distance calling, Call Guard and more</li>}
                                  </ul>
                                  {!offer.lobs.includes('Mobile') && (<div className="plan-upgrade-tag"><Tag size={16} fill="#0067ff" color="#0067ff" className="mr-2" /><span>Upgrade this offer by adding Mobile lines</span></div>)}
                                  <div className="plan-price-block">
                                    <div className="plan-price-left"><div className="plan-price-amount"><span className="plan-currency">$</span><span className="plan-dollars">{offer.price}</span></div><div className="plan-price-terms">{offer.promoDuration ? `/mo for ${offer.promoDuration} mos` : '/mo'}<br />with Auto Pay</div></div>
                                    <div className="plan-price-right"><span className="modal-link">Pricing and other info</span></div>
                                  </div>
                                </div>
                                <div className="plan-card-footer"><span className="modal-link">Show Broadband Label</span></div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </main>

          <footer className="main-footer">
            <div className="footer-content">
              <div className="footer-logo"><SpectrumLogo isDarkBg={true} showBusiness={true} /></div>
              <div className="footer-links">
                <div className="link-group"><span>Product and Offer Disclaimers</span> | <span>Your Privacy Rights</span> | <span>Policies</span> | <span>Contract Buyout Information</span> | <span>Ratecard</span> | <span>California Privacy Policy</span> | <span>California Consumer Do Not Sell or Share My Personal Information</span> | <span>California Consumer Limit the Use of My Sensitive Personal Information</span></div>
                <p>Not all products, pricing and services are available in all areas. Pricing and actual speeds may vary. Internet speeds based on wired connection. Restrictions apply.</p>
                <p>©2024 Charter Communications. All rights reserved.</p>
                <button className="escalation-btn">Escalation button</button>
              </div>
              <div className="footer-phone">1.833.809.4002</div>
            </div>
          </footer>

          {(!result || result.eligible !== false) && (
            <div className="sticky-footer"><div className="status-text font-bold text-lg">Add services</div><button className="btn-continue" style={{ background: selectedServices.internet.length > 0 ? '#0077c8' : '#666', opacity: selectedServices.internet.length > 0 ? 1 : 0.5 }}>Continue</button></div>
          )}
        </div>
      )}

      {showModal && modalContent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-window animate-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{modalContent.title}</h3><button className="close-btn" onClick={() => setShowModal(false)}><X size={24} /></button></div>
            <div className="modal-body" dangerouslySetInnerHTML={{ __html: modalContent.content }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;