import { supabase } from '../lib/supabase';
import { Position, UserProfile, TradeHistory } from '../types';

export const dbService = {
  // Profiles
  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
  },

  async createProfile(profile: UserProfile): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profile])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Positions
  async getPositions(userId: string): Promise<Position[]> {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
  },

  async savePosition(position: Omit<Position, 'id'>): Promise<Position | null> {
    const { data, error } = await supabase
      .from('positions')
      .insert([position])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deletePosition(id: string): Promise<Position | null> {
    const { data, error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Already deleted or not found
      throw error;
    }
    return data;
  },

  // Trade History
  async getHistory(userId: string): Promise<TradeHistory[]> {
    const { data, error } = await supabase
      .from('trade_history')
      .select('*')
      .eq('user_id', userId)
      .order('closed_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async saveHistory(history: Omit<TradeHistory, 'id'>) {
    const { error } = await supabase
      .from('trade_history')
      .insert([history]);
    
    if (error) throw error;
  }
};
