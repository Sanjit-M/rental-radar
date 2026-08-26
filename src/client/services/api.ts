import { RentalListing, DashboardStats, UserListingStatus, PaginatedListingsResponse } from '../../domain/types';

const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const passcode = localStorage.getItem('dashboard_passcode');
  if (passcode) {
    headers['x-dashboard-passcode'] = passcode;
  }
  return headers;
}

export const api = {
  async getListings(params: Record<string, any> = {}): Promise<PaginatedListingsResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });

    const res = await fetch(`${API_BASE}/listings?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (res.status === 401) throw new Error('AUTH_REQUIRED');
    if (!res.ok) throw new Error('Failed to fetch listings');
    return res.json();
  },

  async getListingById(id: number): Promise<RentalListing> {
    const res = await fetch(`${API_BASE}/listings/${id}`, {
      headers: getHeaders(),
    });
    if (res.status === 401) throw new Error('AUTH_REQUIRED');
    if (!res.ok) throw new Error('Failed to fetch listing');
    return res.json();
  },

  async updateListingStatus(id: number, status: UserListingStatus): Promise<{ success: boolean; listing: RentalListing }> {
    const res = await fetch(`${API_BASE}/listings/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status }),
    });
    if (res.status === 401) throw new Error('AUTH_REQUIRED');
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/stats`, {
      headers: getHeaders(),
    });
    if (res.status === 401) throw new Error('AUTH_REQUIRED');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async triggerScrape(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/scrape/trigger`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (res.status === 401) throw new Error('AUTH_REQUIRED');
    if (!res.ok) throw new Error('Failed to trigger scrape');
    return res.json();
  },

  async reseedData(): Promise<{ status: string; count: number }> {
    const res = await fetch(`${API_BASE}/scrape/seed`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (res.status === 401) throw new Error('AUTH_REQUIRED');
    if (!res.ok) throw new Error('Failed to reseed listings');
    return res.json();
  },

  async getConfig(): Promise<{ requiresPasscode: boolean }> {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) return { requiresPasscode: false };
    return res.json();
  },
};
