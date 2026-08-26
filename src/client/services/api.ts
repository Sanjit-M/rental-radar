import { RentalListing, DashboardStats, UserListingStatus } from '../../domain/types';

const API_BASE = '/api';

export const api = {
  async getListings(params: Record<string, any> = {}): Promise<{ count: number; listings: RentalListing[] }> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, String(value));
      }
    });

    const res = await fetch(`${API_BASE}/listings?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch listings');
    return res.json();
  },

  async getListingById(id: number): Promise<RentalListing> {
    const res = await fetch(`${API_BASE}/listings/${id}`);
    if (!res.ok) throw new Error('Failed to fetch listing');
    return res.json();
  },

  async updateListingStatus(id: number, status: UserListingStatus): Promise<{ success: boolean; listing: RentalListing }> {
    const res = await fetch(`${API_BASE}/listings/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  async getStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async triggerScrape(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/scrape/trigger`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger scrape');
    return res.json();
  },

  async reseedData(): Promise<{ status: string; count: number }> {
    const res = await fetch(`${API_BASE}/scrape/seed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reseed listings');
    return res.json();
  },
};
