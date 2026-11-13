'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, Loader2, TrendingUp, Trash2 } from 'lucide-react';
import Link from 'next/link';

type Participant = {
  id: string;
  full_name: string;
  email: string;
  github_username: string;
  is_leader: boolean;
};

type DomainOption = {
  value: string;
  label: string;
};

type Registration = {
  id: string;
  reference_id: string;
  team_uid: string;
  team_name: string;
  institution: string;
  domain: { name: string; id?: string } | undefined;
  challenge_id: string | null;
  registration_status: string;
  member_count: number;
  created_at: string;
  college: string;
  team_details: any;
  participants: Participant[];
};

type Props = {
  teams: Registration[];
  domainOptions: DomainOption[];
};

export default function ParticipantsFilter({ teams, domainOptions }: Props) {
  const [query, setQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function permanentlyDeleteRegistration(reg: Registration) {
    const label = `${reg.team_name || 'Unnamed team'} (${reg.team_uid || reg.reference_id})`;
    const confirmed = window.confirm(
      `PERMANENTLY DELETE ${label}?\n\nThis removes the registration and its linked team, member, accommodation and meal check-in records. Payment details stored on the registration will also be deleted. The action cannot be undone.\n\nContinue only if this is an unwanted/duplicate registration.`
    );
    if (!confirmed) return;
    setDeletingId(reg.id);
    try {
      const response = await fetch(`/api/admin/registrations/${encodeURIComponent(reg.id)}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Registration could not be deleted.');
      window.alert('Registration permanently deleted.');
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Registration could not be deleted.');
      setDeletingId(null);
    }
  }

  // Filter status options - only pending, approved, rejected
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  // Filtered registrations based on search, domain, and status
  const filteredRegistrations = useMemo(() => {
    return teams.filter((reg: any) => {
      // Domain filter - compare domain IDs
      if (selectedDomain !== 'all' && reg.domain?.id !== selectedDomain) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'all' && reg.registration_status !== selectedStatus) {
        return false;
      }
      // Search query
      if (query) {
        const searchTerm = query.toLowerCase();
        const teamNameLower = reg.team_name.toLowerCase();
        const teamUidLower = reg.team_uid?.toLowerCase() || '';
        const institutionLower = reg.institution.toLowerCase();
        const statusLower = reg.registration_status?.toLowerCase() || '';
        // Search within participant names, emails and GitHub usernames
        const participantMatch = reg.participants?.some(
          (p: any) => (p.full_name || '').toLowerCase().includes(searchTerm) ||
                       (p.email || '').toLowerCase().includes(searchTerm) ||
                       (p.github_username || '').toLowerCase().includes(searchTerm)
        );
        return teamNameLower.includes(searchTerm) ||
          teamUidLower.includes(searchTerm) ||
          institutionLower.includes(searchTerm) ||
          statusLower.includes(searchTerm) ||
          participantMatch;
      }
      return true;
    });
  }, [teams, query, selectedDomain, selectedStatus]);

  if (filteredRegistrations.length === 0) {
    return (
      <main className="section portal-section admin-section">
        <div className="py-20 text-center text-black/60">
          <h2>No teams found</h2>
          <p>
            No teams match the current filters. Try adjusting the domain or status filter,
            or search for a specific team name or college.
          </p>
          <Link href="/admin" className="button button-outline mt-4">
            Go to Admin Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="section portal-section admin-section">
      <div className="section-label">
        <span>AVISHKAR 2K26 / ADMINISTRATION</span>
        <form action="/api/auth/logout" method="post">
          <button className="text-link" type="submit">Sign out</button>
        </form>
      </div>

      <div className="portal-heading">
        <div>
          <span className="eyebrow">
            <span className="eyebrow-line" /> PARTICIPANT MANAGEMENT
          </span>
          <h1>Team Registrations<br/><span>Overview.</span></h1>
        </div>

        <div className="portal-toolbar">
          <div className="search-wrapper">
            <Search className="w-5 h-5" />
            <input
              type="text"
              placeholder="Search team name, college, or member..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="select select-bordered"
          >
            <option value="all">All Domains</option>
            {domainOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="select select-bordered"
          >
            <option value="all">All Statuses</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="portal-grid admin-counts">
        <div>
          <small>Total Teams</small>
          <strong>{filteredRegistrations.length}</strong>
        </div>
        <div>
          <small>Domains</small>
          <strong>{new Set(filteredRegistrations.map((t: any) => t.domain?.name || '?')).size}</strong>
        </div>
        <div>
          <small>Pending Approval</small>
          <strong>{filteredRegistrations.filter((t: any) => t.registration_status === 'pending').length}</strong>
        </div>
      </div>

      <div className="admin-registration-list">
        {filteredRegistrations.map((reg: any) => {
          const leader = reg.participants?.find((p: any) => p.is_leader);

          return (
            <details className="portal-panel admin-registration" key={reg.id}>
              <summary>
                <span className="admin-summary-info">
                  <span className="admin-team-code">
                    {reg.team_uid || '—'}
                  </span>
                  <span>
                    <b>{reg.team_name || 'Unnamed Team'}</b>
                    <br />
                    <small>{leader?.full_name || 'No leader'}</small>
                    <br />
                    <small>{reg.domain?.name} — {reg.member_count} members</small>
                  </span>
                  <span className="admin-registration-status">
                    {reg.registration_status?.toUpperCase()}
                  </span>
                </span>
                <span className="admin-actions"></span>
              </summary>

              <div className="admin-detail">
                <div className="flex justify-end mb-4">
                  <button
                    type="button"
                    className="button button-outline text-red-600 border-red-600"
                    disabled={deletingId === reg.id}
                    onClick={() => void permanentlyDeleteRegistration(reg)}
                  >
                    <Trash2 size={15} />
                    {deletingId === reg.id ? 'Deleting…' : 'Permanently delete registration'}
                  </button>
                </div>

                <div className="admin-team-info">
                  <h3>{reg.team_name || 'Unnamed Team'}</h3>
                  <p><strong>College:</strong> {reg.institution || 'Unknown College'}</p>
                  <p><strong>Domain:</strong> {reg.domain?.name || 'Unknown'}</p>
                  <p><strong>Registration Status:</strong> {reg.registration_status?.toUpperCase()}</p>
                  <p><strong>Reference ID:</strong> {reg.reference_id || 'Not assigned'}</p>
                  <p><strong>Registered:</strong> {reg.created_at}</p>
                </div>

                <div className="admin-leader-info">
                  <h4>Team Lead</h4>
                  <p><strong>Name:</strong>{leader ? leader.full_name : 'Not set'}</p>
                  {leader && (
                    <p><strong>Email:</strong> {leader.email || 'Not provided'}</p>
                  )}
                  {leader && (
                    <p><strong>GitHub:</strong> {leader.github_username || 'Not provided'}</p>
                  )}
                </div>

                <div className="admin-members-section">
                  <h4>Team Members <small>({reg.member_count})</small></h4>
                  {reg.participants.map((p: any, idx: number) => (
                    <div key={p.id} className="member-row">
                      <span className="member-name">
                        {p.full_name || `Member ${idx + 1}`}
                        {p.is_leader && <span className="leader-badge">Leader</span>}
                      </span>
                      <span className="member-email">{p.email || '—'}</span>
                      <span className="member-phone">{'—'}</span>
                    </div>
                  ))}
                  {reg.participants?.length ? null : (
                    <p className="no-members-text">No members registered yet</p>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </main>
  );
}