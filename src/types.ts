export interface User {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  phone?: string;
  role?: string;
  callsign?: string;
}

export interface Comment {
  id: string;
  user: User;
  text: string;
  timestamp: string;
}

export interface Post {
  id: string;
  user: User;
  type: 'official' | 'collaborative' | 'staff';
  category?: string;
  title: string;
  description: string;
  image?: string;
  timestamp: string;
  likes: number;
  comments: Comment[];
  isVerified?: boolean;
}

export interface Invite {
  id: string;
  token?: string;
  token_hash: string;
  invited_email?: string;
  invited_phone?: string;
  role_id: string;
  status?: string; // Calculated on frontend
  uses_left: number;
  max_uses: number;
  expires_at: string;
  revoked: boolean;
  inviter_auth_uid?: string;
  created_at?: string;
}

export interface ReportItem {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string; // e.g., 'bg-amber-100 text-amber-700'
  timeAgo: string;
}
