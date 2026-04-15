import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAdvertisements } from '../../services/api';
import Spinner from '../common/Spinner';
import Pagination from '../common/Pagination';

const TRANSMISSION_OPTIONS = ['', 'automatic', 'manual'];
const CONDITION_OPTIONS = ['', 'new', 'used', 'certified'];
const FUEL_OPTIONS = ['', 'gasoline', 'diesel', 'electric', 'hybrid', 'other'];
const SELLER_OPTIONS = ['', 'dealer', 'private'];
const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest First' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-year', label: 'Year: New to Old' },
  { value: 'year', label: 'Year: Old to New' },
];

const formatPrice = (price) => {
  if (!price && price !== 0) return 'N/A';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);
};

const AdvertisementListPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Search & filter state
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [make, setMake] = useState(searchParams.get('make') || '');
  const [model, setModel] = useState(searchParams.get('model') || '');
  const [yearMin, setYearMin] = useState(searchParams.get('yearMin') || '');
  const [yearMax, setYearMax] = useState(searchParams.get('yearMax') || '');
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '');
  const [transmission, setTransmission] = useState(searchParams.get('transmission') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [fuelType, setFuelType] = useState(searchParams.get('fuelType') || '');
  const [sellerType, setSellerType] = useState(searchParams.get('sellerType') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [region, setRegion] = useState(searchParams.get('region') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '-createdAt');

  const canPost = user?.role === 'owner' || user?.role === 'admin';

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit: 12, sort };
      if (keyword) params.keyword = keyword;
      if (make) params.make = make;
      if (model) params.model = model;
      if (yearMin) params.yearMin = yearMin;
      if (yearMax) params.yearMax = yearMax;
      if (priceMin) params.priceMin = priceMin;
      if (priceMax) params.priceMax = priceMax;
      if (transmission) params.transmission = transmission;
      if (condition) params.condition = condition;
      if (fuelType) params.fuelType = fuelType;
      if (sellerType) params.sellerType = sellerType;
      if (city) params.city = city;
      if (region) params.region = region;

      const res = await getAdvertisements(params);
      const data = res.data;
      setAds(data.data || data.advertisements || []);
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 12) || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load advertisements');
    } finally {
      setLoading(false);
    }
  }, [page, sort, keyword, make, model, yearMin, yearMax, priceMin, priceMax, transmission, condition, fuelType, sellerType, city, region]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchAds();
  };

  const clearFilters = () => {
    setKeyword(''); setMake(''); setModel('');
    setYearMin(''); setYearMax('');
    setPriceMin(''); setPriceMax('');
    setTransmission(''); setCondition('');
    setFuelType(''); setSellerType('');
    setCity(''); setRegion('');
    setSort('-createdAt');
    setPage(1);
    setSearchParams({});
  };

  const filterInputStyle = { minWidth: 0, flex: '1 1 140px' };

  return (
    <div className="container">
      <div className="page-header mb-2">
        <div className="flex-between">
          <h1>Car Listings</h1>
          {canPost && (
            <Link to="/advertisements/new" className="btn btn-primary">
              + Post Ad
            </Link>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-2">{error}</div>}

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-2">
        <div className="flex gap-1">
          <input
            type="text"
            className="form-control"
            placeholder="Search by keyword (title, make, model...)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary">Search</button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Filters'}
          </button>
        </div>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card mb-2">
          <div className="card-body">
            <div className="flex gap-2 flex-wrap">
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Make</label>
                <input className="form-control" value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Toyota" />
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Model</label>
                <input className="form-control" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Camry" />
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Year Min</label>
                <input className="form-control" type="number" value={yearMin} onChange={(e) => setYearMin(e.target.value)} placeholder="2000" />
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Year Max</label>
                <input className="form-control" type="number" value={yearMax} onChange={(e) => setYearMax(e.target.value)} placeholder="2024" />
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Price Min</label>
                <input className="form-control" type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="0" />
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Price Max</label>
                <input className="form-control" type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="100000" />
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Transmission</label>
                <select className="form-control" value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                  <option value="">All</option>
                  {TRANSMISSION_OPTIONS.filter(Boolean).map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Condition</label>
                <select className="form-control" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  <option value="">All</option>
                  {CONDITION_OPTIONS.filter(Boolean).map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Fuel Type</label>
                <select className="form-control" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                  <option value="">All</option>
                  {FUEL_OPTIONS.filter(Boolean).map((f) => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Seller Type</label>
                <select className="form-control" value={sellerType} onChange={(e) => setSellerType(e.target.value)}>
                  <option value="">All</option>
                  {SELLER_OPTIONS.filter(Boolean).map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">City</label>
                <input className="form-control" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
              </div>
              <div className="form-group" style={filterInputStyle}>
                <label className="form-label">Region</label>
                <input className="form-control" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="State/Region" />
              </div>
            </div>
            <div className="flex gap-1 mt-2">
              <button className="btn btn-primary btn-sm" onClick={() => { setPage(1); fetchAds(); }}>
                Apply Filters
              </button>
              <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sort */}
      <div className="flex-between mb-2">
        <span className="text-muted text-sm">
          {loading ? 'Loading...' : `${ads.length} listing${ads.length !== 1 ? 's' : ''} found`}
        </span>
        <div className="form-group" style={{ minWidth: 180, marginBottom: 0 }}>
          <select
            className="form-control"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {loading ? (
        <Spinner />
      ) : ads.length === 0 ? (
        <div className="card">
          <div className="card-body text-center" style={{ padding: 48 }}>
            <p className="text-muted text-lg">No listings found</p>
            <p className="text-muted text-sm">Try adjusting your search or filters</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-3" style={{ gap: 16 }}>
            {ads.map((ad) => (
              <Link
                to={`/advertisements/${ad._id}`}
                key={ad._id}
                className="card"
                style={{ textDecoration: 'none', color: 'inherit', transition: 'var(--transition)', display: 'flex', flexDirection: 'column' }}
              >
                {/* Photo Placeholder */}
                <div
                  style={{
                    height: 180,
                    background: 'var(--gray-lighter)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius) var(--radius) 0 0',
                    overflow: 'hidden',
                  }}
                >
                  {ad.images && ad.images.length > 0 ? (
                    <img
                      src={ad.images[0]}
                      alt={ad.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 48, color: 'var(--gray-light)' }}>🚗</span>
                  )}
                </div>
                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>
                    {ad.title || `${ad.year || ''} ${ad.make || ''} ${ad.model || ''}`.trim() || 'Untitled'}
                  </h3>
                  <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)', margin: '0 0 8px' }}>
                    {formatPrice(ad.price)}
                  </p>
                  <div className="text-muted text-sm" style={{ flex: 1 }}>
                    {ad.year && <span>{ad.year} · </span>}
                    {ad.make && <span>{ad.make} </span>}
                    {ad.model && <span>{ad.model}</span>}
                    {ad.mileage != null && (
                      <span> · {ad.mileage.toLocaleString()} mi</span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap mt-1" style={{ fontSize: 12 }}>
                    {ad.transmission && (
                      <span className="badge badge-info">{ad.transmission}</span>
                    )}
                    {ad.condition && (
                      <span className="badge badge-success">{ad.condition}</span>
                    )}
                  </div>
                  {(ad.city || ad.location?.city || ad.region || ad.location?.region) && (
                    <p className="text-muted text-sm" style={{ margin: '8px 0 0' }}>
                      📍 {ad.city || ad.location?.city}{ad.region || ad.location?.region ? `, ${ad.region || ad.location?.region}` : ''}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-2">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
};

export default AdvertisementListPage;
