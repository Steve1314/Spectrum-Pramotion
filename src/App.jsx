import React, { useState, useEffect } from 'react';
import {
  DollarSign, Calculator, FileText, BarChart2,
  MapPin, ChevronDown, ChevronUp, X,
  Wifi, Smartphone, Monitor, Phone, Info,
  Settings, Check, Send, AlertCircle, ShoppingCart,
  CheckCircle2
} from 'lucide-react';
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
  // Navigation State
  const [viewState, setViewState] = useState('landing');

  // Developer Setup States
  const [showDevSettings, setShowDevSettings] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('spectrum_direct_token') || '');

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


  // Bundle Selector States
  const [selectedServices, setSelectedServices] = useState({
    internet: [],
    mobile: [],
    tv: [],
    voice: []
  });

  // Modal States
  const [modalContent, setModalContent] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('spectrum_direct_token', token);
  }, [token]);

  // Toggle sections
  const toggleSection = (section) => {
    setActiveSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Handle service checkbox selection
  const handleServiceChange = (category, value) => {
    setSelectedServices(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  // Fetch Modal Content
  const fetchModal = async (type) => {
    setLoading(true);
    let url = '';
    if (type === 'disclaims') {
      url = '/spectrum-api/checkout/x-ref/disclaimers-modal/_jcr_content/root/responsivegrid/responsivegrid.model.json';
    } else {
      url = '/spectrum-api/content/spectrum/buyflow-business/en/xref-global/broadband-label-modal/_jcr_content/root/responsivegrid/responsivegrid_141585965.model.json';
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

  // Run Availability Check
  const runTest = async () => {
    if (!token) {
      setShowDevSettings(true);
      setError('Please set a valid Spectrum JWT token in settings first.');
      return;
    }

    setLoading(true);
    setError(null);

    const requestBody = {
      addressInformation: {
        line1: address,
        line2: apt,
        postalCode: zip
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
        '/spectrum-api/services/spectrum/serviceability/proxy.api/serviceability-wrapper/v2/offers/address?returnSessionInfo=true&system=CSS',
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

      // Handle Multi-Match (Reason Code 120)
      if (data.reasonInfo?.reasonCode === "120") {
        setMultiMatchData(data);
        setViewState('address-selection');
        setLoading(false);
        return;
      }


      setResult({
        success: true,
        eligible: data.eligibleForOffers !== false, // Explicitly false when out of footprint
        sessionInfo: data.sessionInfo,
        offers: data.offers?.map(offer => {
          let promoDuration = offer.pricing?.promoDuration;
          if (!promoDuration) promoDuration = (offer.pricing?.netPrice === '100' || (offer.name && offer.name.includes('Ultra'))) ? 24 : 12;

          let bannerText = offer.banner || offer.bannerText || offer.pricing?.priceGuaranteeText;
          if (!bannerText && offer.pricing?.priceGuarantee) {
            bannerText = `${offer.pricing.priceGuarantee}-Year Price Guarantee`;
          }
          if (!bannerText && offer.tags) {
            const guaranteeTag = (offer.tags || []).find(t => typeof t === 'string' && /Guarantee/i.test(t));
            if (guaranteeTag) bannerText = guaranteeTag;
          }

          // Strict fallback matching authentic website observed logic if API didn't provide standard fields
          if (!bannerText && offer.name && typeof offer.name === 'string' && offer.name.includes('Ultra')) {
            if (promoDuration === 24) bannerText = "2-Year Price Guarantee";
            if (promoDuration === 36) bannerText = "3-Year Price Guarantee";
          }

          return {
            id: offer.id,
            name: offer.name,
            speed: offer.internetSpeedText || '',
            lobs: offer.lineOfBusiness || [],
            price: offer.pricing?.netPrice || '0',
            priceType: offer.pricing?.displayPriceType || 'with Auto Pay',
            group: offer.group,
            banner: bannerText || null,
            promoDuration: promoDuration
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

  const handleAddressSelect = (addr) => {
    setAddress(addr.line1);
    setApt(addr.line2 || '');
    setZip(addr.postalCode);
    setViewState('landing');
    setMultiMatchData(null);
    setAddressSearch('');
    
    // Trigger runTest after a short delay to allow state to settle
    setTimeout(() => {
      // Find the button and click it, or just call runTest directly
      // Since runTest is a closure, it might have stale state if called directly here.
      // But actually, it's defined inside App, so it will see the new state on next render.
      // The setTimeout ensures it runs after the render that sets viewState to 'landing'.
      document.querySelector('.btn-check')?.click();
    }, 100);
  };



  const handleEditLocation = () => {
    setViewState('landing');
  };

  return (
    <div className="spectrum-app">
      {/* Dev Settings Drawer */}
      {showDevSettings && (
        <div className="dev-settings animate-in">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <label className="block mb-1 opacity-70">JWT Token</label>
              <textarea
                className="w-full text-[10px]"
                rows={4}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste Spectrum JWT here..."
              />
            </div>
            <button onClick={() => setShowDevSettings(false)} className="text-white hover:text-red-400 p-1">
              <X size={20} />
            </button>
          </div>
        </div>
      )}



      {/* TOP UTILITY BAR */}


      {/* Header */}
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
          <button onClick={() => setShowDevSettings(true)} className="settings-btn">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {viewState === 'landing' ? (
        /* LANDING VIEW (Matches Screenshot) */
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

            <button
              className="btn-check"
              onClick={runTest}
              disabled={loading || !address || !zip}
            >
              {loading ? 'Checking Availability...' : 'CHECK AVAILABILITY'}
            </button>
          </div>
        </div>
      ) : viewState === 'address-selection' ? (
        /* ADDRESS SELECTION VIEW (Multi-Match) */
        <div className="address-selection-view animate-in">
          <h1 className="as-title">Please select the suite/floor #</h1>

          <div className="as-current-address" onClick={() => setViewState('landing')}>
            <MapPin size={22} />
            <span>{address?.toLowerCase()}, {zip}</span>
          </div>

          <p className="as-description">
            There are multiple units at this location. Please add the suite/floor # of the business below.
          </p>

          <div className="as-search-container">
            <label className="as-search-label">Suite/floor #</label>
            <input
              type="text"
              className="as-search-input"
              placeholder="Suite/floor #"
              value={addressSearch}
              onChange={e => setAddressSearch(e.target.value)}
            />
          </div>

          <div className="as-list">
            {(multiMatchData?.addressList || [])
              .filter(addr => !addressSearch || (addr.line2 || 'n/a').toLowerCase().includes(addressSearch.toLowerCase()))
              .map((addr, idx) => (
                <div
                  key={idx}
                  className="as-item"
                  onClick={() => handleAddressSelect(addr)}
                >
                  {addr.line2 || <span className="as-item-na">N/A</span>}
                </div>

              ))}
          </div>

          <div className="as-back-link" onClick={() => setViewState('landing')}>
            <X size={14} /> Cancel and start over
          </div>
        </div>
      ) : (

        /* PORTAL VIEW (SERVICES OR NOT SERVICEABLE) */
        <div className="portal-view animate-in">
          <main className="page-container">
            {result && result.eligible === false ? (
              <div className="out-of-footprint">
                <h1 className="oof-title">
                  Spectrum Business does not<br />provide service in this area
                </h1>

                <div className="oof-address-block">
                  <div className="oof-address">
                    {address}, {zip}
                  </div>
                  <div className="oof-subtitle">
                    Is this the right address?
                  </div>
                </div>

                <button
                  className="oof-start-over-btn"
                  onClick={handleEditLocation}
                >
                  START OVER
                </button>

                <div className="oof-help-text">
                  If the address is entered correctly,<br />
                  we'll help <span className="oof-link">find a provider</span> for that area.
                </div>

                <div className="oof-call-text">
                  To place an order, please call <span>1.833.809.4002</span>
                </div>
              </div>
            ) : (
              <>
                <h1 className="page-title">
                  Choose Services
                  <div className="location-info-right" onClick={handleEditLocation}>
                    <MapPin size={14} className="mr-1" />
                    <span className="underline">{address}, {zip}</span>
                  </div>
                </h1>

                {/* GIS Overview */}
                <section tabIndex={0}>
                  <div className="section-header" onClick={() => toggleSection('gis')}>
                    <h3>GIS Overview <span className="ml-2 text-[10px] px-2 py-0.5 rounded font-bold" style={{
                      backgroundColor: result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationColor === 'GREEN' ? '#e6f3d9' : '#fff3cd',
                      color: result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationColor === 'GREEN' ? '#4d7a22' : '#856404',
                      border: `1px solid ${result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationColor === 'GREEN' ? '#d0e9b9' : '#ffeeba'}`
                    }}>
                      {result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationText || 'SERVICEABLE'}
                    </span></h3>
                    {activeSections.gis ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  {activeSections.gis && (
                    <div className="section-content animate-in !pt-0">
                      <p className="text-sm text-dim mt-4 mb-2">
                        {result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationReason || 'Address is an active location or former Spectrum customer. Please proceed with scheduling.'}
                      </p>

                      <table className="gis-table">
                        <tbody>
                          <tr>
                            <td>GIS status</td>
                            <td>{result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationColor === 'GREEN' ? 'RDOFZ' : 'N/A'}</td>
                          </tr>
                          <tr>
                            <td>GIS recommendation</td>
                            <td>{result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationText || 'Billing Match'}</td>
                          </tr>
                          <tr>
                            <td>GIS recommendation reasons</td>
                            <td>{result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisRecommendationReason || 'Address is an active location or former Spectrum customer.'}</td>
                          </tr>
                          <tr>
                            <td>C A S S address</td>
                            <td>{result?.sessionInfo?.serviceAddress?.gisRecommendationData?.gisAddressLine || address.toUpperCase()}</td>
                          </tr>
                          <tr>
                            <td>Hookup Type</td>
                            <td>{result?.sessionInfo?.serviceAddress?.connectionType || 'Coax'}</td>
                          </tr>
                          <tr>
                            <td>Mobile</td>
                            <td>{result?.sessionInfo?.serviceAddress?.serviceability?.mobileEligible ? 'Yes' : 'No'}</td>
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
                    <h3>Resources</h3>
                    {activeSections.resources ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                  {activeSections.resources && (
                    <div className="section-content resource-grid animate-in">
                      <div className="resource-card"><DollarSign size={24} color="#00629b" /><span>Pricing</span></div>
                      <div className="resource-card"><Calculator size={24} color="#00629b" /><span>Mobile Calculator</span></div>
                      <div className="resource-card"><BarChart2 size={24} color="#00629b" /><span>O2</span></div>
                      <div className="resource-card"><FileText size={24} color="#00629b" /><span>Sales Quote</span></div>
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
                  <div className="section-header border-none">
                    <h3 className="text-2xl pt-8">Build a Bundle</h3>
                  </div>
                  <p className="text-xs text-blue-600 underline mb-4 cursor-pointer">See additional product details</p>

                  <div className="bundle-grid">
                    <div className="bundle-column">
                      <h4>INTERNET</h4>
                      <div className="text-[10px] text-dim mb-2">(Select up to 3 options)</div>
                      <div className="bundle-option">
                        <input type="checkbox" id="int-adv"
                          checked={selectedServices.internet.includes('advantage')}
                          onChange={() => handleServiceChange('internet', 'advantage')} />
                        <label htmlFor="int-adv">
                          <div>BUSINESS INTERNET ADVANTAGE</div>
                          <div className="subtext">Up to 100 Mbps</div>
                        </label>
                      </div>
                      <div className="bundle-option">
                        <input type="checkbox" id="int-prem"
                          checked={selectedServices.internet.includes('premier')}
                          onChange={() => handleServiceChange('internet', 'premier')} />
                        <label htmlFor="int-prem">
                          <div>BUSINESS INTERNET PREMIER</div>
                          <div className="subtext">Up to 500 Mbps</div>
                        </label>
                      </div>
                      <div className="bundle-option">
                        <input type="checkbox" id="int-ultra"
                          checked={selectedServices.internet.includes('ultra')}
                          onChange={() => handleServiceChange('internet', 'ultra')} />
                        <label htmlFor="int-ultra">
                          <div>BUSINESS INTERNET ULTRA</div>
                          <div className="subtext">Up to 750 Mbps</div>
                        </label>
                      </div>
                      <div className="bundle-option">
                        <input type="checkbox" id="int-gig"
                          checked={selectedServices.internet.includes('gig')}
                          onChange={() => handleServiceChange('internet', 'gig')} />
                        <label htmlFor="int-gig">
                          <div>BUSINESS INTERNET GIG</div>
                          <div className="subtext">Up to 1 Gbps</div>
                        </label>
                      </div>
                      <div className="bundle-option">
                        <input type="checkbox" id="int-2gig"
                          checked={selectedServices.internet.includes('2 gig')}
                          onChange={() => handleServiceChange('internet', '2 gig')} />
                        <label htmlFor="int-2gig">
                          <div>BUSINESS INTERNET 2 GIG</div>
                          <div className="subtext">Up to 2 Gbps</div>
                        </label>
                      </div>
                    </div>

                    <div className="bundle-column">
                      <h4>MOBILE</h4>
                      <div className="text-[10px] text-dim mb-2">(Select up to 1 option)</div>
                      <div className="bundle-option">
                        <input type="checkbox" id="mob-1"
                          checked={selectedServices.mobile.includes('mobile')}
                          onChange={() => handleServiceChange('mobile', 'mobile')} />
                        <label htmlFor="mob-1">
                          <div>MOBILE</div>
                          <div className="subtext">Unlimited Nationwide 5G Coverage</div>
                        </label>
                      </div>
                    </div>

                    <div className="bundle-column">
                      <h4>TV</h4>
                      <div className="text-[10px] text-dim mb-2">(Select up to 2 options)</div>
                      <div className="bundle-option">
                        <input type="checkbox" id="tv-stream-latino"
                          checked={selectedServices.tv.includes('tv-latino')}
                          onChange={() => handleServiceChange('tv', 'tv-latino')} />
                        <label htmlFor="tv-stream-latino">
                          <div>BUSINESS TV STREAM LATINO</div>
                          <div className="subtext">45+ channels</div>
                        </label>
                      </div>
                      <div className="bundle-option">
                        <input type="checkbox" id="tv-bus"
                          checked={selectedServices.tv.includes('tv-bus')}
                          onChange={() => handleServiceChange('tv', 'tv-bus')} />
                        <label htmlFor="tv-bus">
                          <div>BUSINESS TV</div>
                          <div className="subtext">50+ channels</div>
                        </label>
                      </div>
                      <div className="bundle-option">
                        <input type="checkbox" id="tv-stream"
                          checked={selectedServices.tv.includes('tv-stream')}
                          onChange={() => handleServiceChange('tv', 'tv-stream')} />
                        <label htmlFor="tv-stream">
                          <div>BUSINESS TV STREAM</div>
                          <div className="subtext">70+ channels</div>
                        </label>
                      </div>
                      <div className="bundle-option">
                        <input type="checkbox" id="tv-prem"
                          checked={selectedServices.tv.includes('tv-prem')}
                          onChange={() => handleServiceChange('tv', 'tv-prem')} />
                        <label htmlFor="tv-prem">
                          <div>BUSINESS TV PREMIER</div>
                          <div className="subtext">90+ channels</div>
                        </label>
                      </div>
                    </div>

                    <div className="bundle-column">
                      <h4>COMMUNICATIONS</h4>
                      <div className="text-[10px] text-dim mb-2">(Select up to 2 options)</div>
                      <div className="bundle-option">
                        <input type="checkbox" id="comm-voice"
                          checked={selectedServices.voice.includes('business-voice')}
                          onChange={() => handleServiceChange('voice', 'business-voice')} />
                        <label htmlFor="comm-voice">
                          <div>BUSINESS VOICE</div>
                          <div className="subtext">Cloud & landline Communications</div>
                        </label>
                      </div>
                      <div className="bundle-option">
                        <input type="checkbox" id="comm-conn"
                          checked={selectedServices.voice.includes('business-connect')}
                          onChange={() => handleServiceChange('voice', 'business-connect')} />
                        <label htmlFor="comm-conn">
                          <div>BUSINESS CONNECT</div>
                          <div className="subtext">All-in-one business communications</div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bundle-actions">
                    <button className="btn-reset" onClick={() => setSelectedServices({ internet: [], mobile: [], tv: [], voice: [] })}>RESET</button>
                    <button className="btn-apply" onClick={runTest}>APPLY</button>
                  </div>
                </section>

                {/* Plans List */}
                {result && (
                  <div className="animate-in pb-20">
                    <div className="plans-header">
                      {(() => {
                        const selectedLOBs = [];
                        if (selectedServices.internet.length > 0) selectedLOBs.push('Internet');
                        if (selectedServices.mobile.length > 0) selectedLOBs.push('Mobile');
                        if (selectedServices.tv.length > 0) selectedLOBs.push('TV');
                        if (selectedServices.voice.length > 0) selectedLOBs.push('Phone');

                        if (selectedLOBs.length === 0) return '0 plans. Please select services to build a bundle.';

                        let filtered = result.offers.filter(offer => {
                          const hasAllSelected = selectedLOBs.every(lob => offer.lobs.includes(lob));
                          const hasNoExtra = offer.lobs.length === selectedLOBs.length;
                          if (!hasAllSelected || !hasNoExtra) return false;

                          if (selectedServices.internet.length > 0) {
                            // Match authentic tier names directly against the Spectrum response
                            const matchedTier = selectedServices.internet.some(tier =>
                              offer.name.toLowerCase().includes(tier.toLowerCase())
                            );
                            if (!matchedTier) return false;
                          }
                          return true;
                        });

                        const uniqueMap = new Map();
                        filtered.forEach(offer => {
                          if (!uniqueMap.has(offer.speed)) uniqueMap.set(offer.speed, offer);
                        });
                        filtered = Array.from(uniqueMap.values());

                        return `${filtered.length} plans`;
                      })()}
                    </div>
                    <div className="plans-grid">
                      {(() => {
                        const selectedLOBs = [];
                        if (selectedServices.internet.length > 0) selectedLOBs.push('Internet');
                        if (selectedServices.mobile.length > 0) selectedLOBs.push('Mobile');
                        if (selectedServices.tv.length > 0) selectedLOBs.push('TV');
                        if (selectedServices.voice.length > 0) selectedLOBs.push('Phone');

                        if (selectedLOBs.length === 0) return null;

                        let filtered = result.offers.filter(offer => {
                          const hasAllSelected = selectedLOBs.every(lob => offer.lobs.includes(lob));
                          const hasNoExtra = offer.lobs.length === selectedLOBs.length;
                          if (!hasAllSelected || !hasNoExtra) return false;

                          if (selectedServices.internet.length > 0) {
                            // Match authentic tier names directly against the Spectrum response
                            const matchedTier = selectedServices.internet.some(tier =>
                              offer.name.toLowerCase().includes(tier.toLowerCase())
                            );
                            if (!matchedTier) return false;
                          }
                          return true;
                        });

                        const uniqueMap = new Map();
                        filtered.forEach(offer => {
                          if (!uniqueMap.has(offer.speed)) uniqueMap.set(offer.speed, offer);
                        });

                        return Array.from(uniqueMap.values()).map((offer, i) => {

                          return (
                            <div key={i} className="plan-card">
                              <div className="plan-toggle-decor" />
                              {offer.banner ? (
                                <div className="plan-banner">{offer.banner}</div>
                              ) : (
                                <div className="plan-banner" style={{ visibility: 'hidden' }}>&nbsp;</div>
                              )}
                              <div className="plan-body">
                                <div className="plan-title">{offer.name}</div>
                                <div className="plan-speed">{offer.speed} {offer.speed && '|'} 35+ Calling Features (Paid)</div>

                                <div className="mt-4 text-sm text-[#444] mb-10">
                                  {/* Using authentic tier descriptions if available, else standard fallback */}
                                  {offer.name.includes('Ultra') ? (
                                    "Good for e-commerce, file sharing and cloud-based applications with speeds up to 750 Mbps"
                                  ) : (
                                    offer.name.includes('Premier') ? (
                                      "Reliable Internet for web browsing, email and casual online tasks with speeds up to 500 Mbps"
                                    ) : (
                                      `Professional services with speeds up to ${parseInt(offer.speed) || '300'} Mbps for your daily business needs.`
                                    )
                                  )}
                                  {offer.lobs.includes('Phone') && (
                                    <div className="mt-2">Business phone with unlimited local and long-distance calling, Call Guard and more</div>
                                  )}
                                  {!offer.lobs.includes('Mobile') && (
                                    <div className="mt-2 text-blue-600 font-bold border-l-2 border-blue-600 pl-2">Upgrade this offer by adding Mobile lines</div>
                                  )}
                                </div>
                              </div>
                              <div className="plan-footer">
                                <div className="plan-price-box">
                                  <span className="currency">$</span>
                                  <span className="price">{offer.price}</span>
                                  <div className="price-period">/mo <br />for {offer.promoDuration} mos <br /> {offer.priceType || 'with Auto Pay'}</div>
                                </div>
                                <div className="modal-links">
                                  <span className="modal-link" onClick={() => fetchModal('disclaims')}>Pricing and other info</span>
                                  <span className="modal-link" onClick={() => fetchModal('broadband')}>Show Broadband Label</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>

          <footer className="main-footer">
            <div className="footer-content">
              <div className="footer-logo">
                <SpectrumLogo isDarkBg={true} showBusiness={true} />
              </div>
              <div className="footer-links">
                <div className="link-group">
                  <span>Product and Offer Disclaimers</span> |
                  <span>Your Privacy Rights</span> |
                  <span>Policies</span> |
                  <span>Contract Buyout Information</span> |
                  <span>Ratecard</span> |
                  <span>California Privacy Policy</span> |
                  <span>California Consumer Do Not Sell or Share My Personal Information</span> |
                  <span>California Consumer Limit the Use of My Sensitive Personal Information</span>
                </div>
                <p>Not all products, pricing and services are available in all areas. Pricing and actual speeds may vary. Internet speeds based on wired connection. Restrictions apply.</p>
                <p>©2024 Charter Communications. All rights reserved.</p>
                <button className="escalation-btn">Escalation button</button>
              </div>
              <div className="footer-phone">
                1.833.809.4002
              </div>
            </div>
          </footer>

          {(!result || result.eligible !== false) && (
            <div className="sticky-footer">
              <div className="status-text font-bold text-lg">Add services</div>
              <button className="btn-continue"
                style={{ background: selectedServices.internet.length > 0 ? '#0077c8' : '#666', opacity: selectedServices.internet.length > 0 ? 1 : 0.5 }}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dynamic Modal */}
      {showModal && modalContent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-window animate-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalContent.title}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body" dangerouslySetInnerHTML={{ __html: modalContent.content }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
