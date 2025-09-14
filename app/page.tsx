'use client';

import { useState, useEffect } from 'react';
import { useLogtoUser } from '../hooks/useLogtoUser';
import Icon from '@hackclub/icons';
import SearchableSelect from '../components/SearchableSelect';

interface ExtendedUserInfo {
  sub?: string;
  name?: string;
  username?: string;
  email?: string;
  roles?: Array<{ id: string; name: string; }>;
}

interface Subdomain {
  id: string;
  subdomain: string;
  email: string;
  githubRepo: string;
  domains: string[];
  domainName: string;
  clubName: string[];
  clubNameAfonso: string;
  status: boolean;
}

interface Domain {
  id: string;
  name: string;
}

interface ClubName {
  id: string;
  name: string;
}

export default function Home() {
  const { signIn, signOut, isAuthenticated, isLoading, error, userInfo } = useLogtoUser();
  const [subdomains, setSubdomains] = useState<Subdomain[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [clubNames, setClubNames] = useState<ClubName[]>([]);
  const [newSubdomain, setNewSubdomain] = useState('');
  const [newGithubRepo, setNewGithubRepo] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Role checking functions
  const MULTI_SUBDOMAIN_ROLE = '5qklnjvv7q4kvlx130hnx';
  const ADMIN_ROLE = 'db1lec6115beilwhuegth';
  
  const extendedUserInfo = userInfo as ExtendedUserInfo;
  
  const hasRole = (roleId: string) => {
    console.log('Checking role:', roleId);
    console.log('User roles:', extendedUserInfo?.roles);
    return extendedUserInfo?.roles?.some((role: any) => role.id === roleId) || false;
  };
  
  const canCreateMultipleSubdomains = hasRole(MULTI_SUBDOMAIN_ROLE);
  const isAdmin = hasRole(ADMIN_ROLE);
  const displayName = extendedUserInfo?.name || extendedUserInfo?.username || extendedUserInfo?.email || 'User';
  
  console.log('Role check results:', { canCreateMultipleSubdomains, isAdmin, userInfo: extendedUserInfo });

  useEffect(() => {
    if (isAuthenticated) {
      const fetchInitialData = async () => {
        setDashboardLoading(true);
        setDashboardError(null);
        try {
          const [subdomainsRes, domainsRes, clubNamesRes] = await Promise.all([
            fetch('/api/subdomains'),
            fetch('/api/domains'),
            fetch('/api/club-names'),
          ]);

          if (!subdomainsRes.ok) throw new Error('Failed to fetch subdomains');
          if (!domainsRes.ok) throw new Error('Failed to fetch domains');
          if (!clubNamesRes.ok) throw new Error('Failed to fetch club names');

          const subdomainsData = await subdomainsRes.json();
          const domainsData = await domainsRes.json();
          const clubNamesData = await clubNamesRes.json();

          console.log('=== DATA DEBUG ===');
          console.log('Subdomains:', subdomainsData.length, 'items');
          console.log('Domains:', domainsData.length, 'items');
          console.log('Club Names:', clubNamesData.length, 'items');
          console.log('First club name:', clubNamesData[0]);
          console.log('First domain:', domainsData[0]);

          setSubdomains(subdomainsData);
          setDomains(domainsData);
          setClubNames(clubNamesData);
        } catch (err: any) {
          setDashboardError(err.message);
        } finally {
          setDashboardLoading(false);
        }
      };
      fetchInitialData();
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setSubmitMessage(null);

    // Check subdomain limit
    if (!canCreateMultipleSubdomains && subdomains.length >= 1) {
      setSubmitMessage('You can only create one subdomain. Contact an admin if you need more.');
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/subdomains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subdomain: newSubdomain,
          githubRepo: newGithubRepo,
          domains: [selectedDomain], // Airtable expects an array of record IDs for linked fields
          clubName: [selectedClub], // Airtable expects an array of record IDs for linked fields
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit subdomain request');
      }
      setSubmitMessage(data.message);
      setNewSubdomain('');
      setNewGithubRepo('');
      setSelectedDomain('');
      setSelectedClub('');
      // Refresh subdomains list
      const subdomainsRes = await fetch('/api/subdomains');
      const subdomainsData = await subdomainsRes.json();
      setSubdomains(subdomainsData);

    } catch (err: any) {
      setSubmitMessage(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditGithubRepo = async (id: string, newRepo: string) => {
    setFormLoading(true);
    setSubmitMessage(null);
    try {
      const res = await fetch(`/api/subdomains/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ githubRepo: newRepo }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update GitHub Repo');
      }
      setSubmitMessage(data.message);
      // Refresh subdomains list
      const subdomainsRes = await fetch('/api/subdomains');
      const subdomainsData = await subdomainsRes.json();
      setSubdomains(subdomainsData);

    } catch (err: any) {
      setSubmitMessage(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex flex-col items-center justify-center min-h-screen">Loading authentication...</div>;
  }

  if (error) {
    return <div className="flex flex-col items-center justify-center min-h-screen">Error: {error.message}</div>;
  }

  return (
    <div className="min-h-screen bg-white">
      {isAuthenticated ? (
        <div className="hc-container">
          {/* Header */}
          <div className="hc-header">
            <div>
              <h1 style={{ color: '#ec3750', fontSize: '2.5rem', fontWeight: 'bold', margin: 0 }}>
                Club Subdomains
              </h1>
              <p style={{ color: '#1f2d3d', fontSize: '1.1rem', margin: '8px 0 0 0' }}>
                Manage your Hack Club subdomains
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#1f2d3d' }}>Welcome, {displayName}!</span>
                {isAdmin && (
                  <span style={{
                    backgroundColor: '#ec3750',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase'
                  }}>
                    Admin
                  </span>
                )}
              </div>
              <button onClick={() => signOut()} className="hc-button-secondary">
                <Icon glyph="door-leave" size={16} style={{ marginRight: '8px' }} />
                Sign Out
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="hc-grid">
            {/* Request Form Card */}
            <div className="hc-card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ color: '#ec3750', fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                  <Icon glyph="inserter" size={20} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                  Request New Subdomain
                </h2>
                <div style={{ 
                  fontSize: '0.875rem', 
                  color: canCreateMultipleSubdomains ? '#10b981' : '#f59e0b',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Icon glyph="info" size={14} />
                  {canCreateMultipleSubdomains 
                    ? `Unlimited subdomains (${subdomains.length} created)`
                    : `${subdomains.length}/1 subdomain used`
                  }
                </div>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label htmlFor="subdomain" className="hc-label">Subdomain</label>
                  <input
                    type="text"
                    id="subdomain"
                    className="hc-input"
                    value={newSubdomain}
                    onChange={(e) => setNewSubdomain(e.target.value)}
                    placeholder="my-awesome-project"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="githubRepo" className="hc-label">GitHub Repository</label>
                  <input
                    type="url"
                    id="githubRepo"
                    className="hc-input"
                    value={newGithubRepo}
                    onChange={(e) => setNewGithubRepo(e.target.value)}
                    placeholder="https://github.com/username/repo"
                    required
                  />
                </div>
                <SearchableSelect
                  options={domains}
                  value={selectedDomain}
                  onChange={setSelectedDomain}
                  placeholder="Search for a domain..."
                  label="Domain"
                  required
                />
                <SearchableSelect
                  options={clubNames}
                  value={selectedClub}
                  onChange={setSelectedClub}
                  placeholder="Search for your club..."
                  label="Club Name"
                  required
                />
                <button 
                  type="submit" 
                  disabled={formLoading || (!canCreateMultipleSubdomains && subdomains.length >= 1)} 
                  className="hc-button" 
                  style={{ 
                    width: '100%',
                    opacity: (!canCreateMultipleSubdomains && subdomains.length >= 1) ? 0.5 : 1,
                    cursor: (!canCreateMultipleSubdomains && subdomains.length >= 1) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {formLoading ? (
                    <>
                      <Icon glyph="controls" size={16} style={{ marginRight: '8px' }} />
                      Submitting...
                    </>
                  ) : (!canCreateMultipleSubdomains && subdomains.length >= 1) ? (
                    <>
                      <Icon glyph="view-close" size={16} style={{ marginRight: '8px' }} />
                      Limit Reached
                    </>
                  ) : (
                    <>
                      <Icon glyph="checkmark" size={16} style={{ marginRight: '8px' }} />
                      Submit Request
                    </>
                  )}
                </button>
                {submitMessage && (
                  <div style={{
                    padding: '16px',
                    borderRadius: '12px',
                    backgroundColor: submitMessage.includes('success') ? '#10b981' : '#ef4444',
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    {submitMessage}
                  </div>
                )}
              </form>

              {/* Limit Reached Overlay */}
              {!canCreateMultipleSubdomains && subdomains.length >= 1 && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '40px',
                  textAlign: 'center',
                  zIndex: 10
                }}>
                  <Icon glyph="emoji" size={64} style={{ color: '#f59e0b', marginBottom: '24px' }} />
                  <h3 style={{ 
                    color: '#ec3750', 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    margin: '0 0 16px 0' 
                  }}>
                    Subdomain Limit Reached
                  </h3>
                  <p style={{ 
                    color: '#1f2d3d', 
                    fontSize: '1rem', 
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: 0
                  }}>
                    You've reached your limit of 1 subdomain. Need more? 
                    <br />
                    <strong>DM @lynn on Slack</strong> for assistance.
                  </p>
                </div>
              )}
            </div>

            {/* Subdomains List Card */}
            <div className="hc-card">
              <h2 style={{ color: '#ec3750', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
                <Icon glyph="home" size={20} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
                Your Subdomains
              </h2>
              {dashboardLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#1f2d3d' }}>
                  <Icon glyph="controls" size={24} />
                  <p style={{ marginTop: '16px' }}>Loading subdomains...</p>
                </div>
              ) : dashboardError ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
                  <Icon glyph="bug" size={24} />
                  <p style={{ marginTop: '16px' }}>Error: {dashboardError}</p>
                </div>
              ) : subdomains.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#1f2d3d' }}>
                  <Icon glyph="idea" size={48} style={{ opacity: 0.3 }} />
                  <p style={{ marginTop: '16px', fontSize: '1.1rem' }}>No subdomains yet</p>
                  <p style={{ marginTop: '8px', opacity: 0.7 }}>Create your first subdomain using the form!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {subdomains.map((subdomain) => (
                    <div key={subdomain.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '20px',
                      border: '1px solid #dddddd',
                      borderRadius: '12px',
                      backgroundColor: '#fafafa'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          color: '#1f2d3d', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold', 
                          margin: '0 0 8px 0' 
                        }}>
                          {subdomain.subdomain}.{subdomain.domainName}
                        </h3>
                        <p style={{ color: '#666', margin: '4px 0', fontSize: '0.9rem' }}>
                          <Icon glyph="github" size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
                          <a 
                            href={subdomain.githubRepo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#ec3750', textDecoration: 'none' }}
                            onMouseOver={(e) => (e.target as HTMLElement).style.textDecoration = 'underline'}
                            onMouseOut={(e) => (e.target as HTMLElement).style.textDecoration = 'none'}
                          >
                            {subdomain.githubRepo}
                          </a>
                        </p>
                        <p style={{ color: '#666', margin: '4px 0', fontSize: '0.9rem' }}>
                          <Icon glyph="flag" size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }} />
                          {subdomain.clubNameAfonso}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={subdomain.status ? 'hc-status-active' : 'hc-status-pending'}>
                          <Icon glyph={subdomain.status ? 'checkmark' : 'controls'} size={12} style={{ marginRight: '4px' }} />
                          {subdomain.status ? 'Active' : 'Pending'}
                        </div>
                        <button
                          onClick={() => {
                            const newRepo = prompt('Enter new GitHub Repository URL:', subdomain.githubRepo);
                            if (newRepo) handleEditGithubRepo(subdomain.id, newRepo);
                          }}
                          className="hc-button-secondary"
                          style={{ fontSize: '0.875rem', padding: '8px 16px' }}
                        >
                          <Icon glyph="edit" size={14} style={{ marginRight: '6px' }} />
                          Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          padding: '0 24px'
        }}>
          <Icon glyph="flag" size={64} style={{ color: '#ec3750', marginBottom: '24px' }} />
          <h1 style={{ color: '#ec3750', fontSize: '3rem', fontWeight: 'bold', margin: '0 0 16px 0' }}>
            Club Subdomains
          </h1>
          <p style={{ color: '#1f2d3d', fontSize: '1.2rem', margin: '0 0 32px 0', maxWidth: '500px' }}>
            Get your own subdomain for your Hack Club project! Sign in to get started.
          </p>
          <button onClick={() => signIn('http://localhost:3000')} className="hc-button">
            <Icon glyph="door-enter" size={16} style={{ marginRight: '8px' }} />
            Sign In with Logto
          </button>
        </div>
      )}
    </div>
  );
}
