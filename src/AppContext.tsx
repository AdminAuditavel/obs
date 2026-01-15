import React, { createContext, useContext, useState, useEffect } from 'react';
import { Post, Invite, ReportItem, User } from './types';
import { INITIAL_POSTS, INITIAL_INVITES, INITIAL_REPORTS, IMAGES } from './constants';
import { supabase } from './supabaseClient';

// Define Airport Interface
export interface Airport {
  id: string;
  icao: string;
  name: string;
  city: string;
  state: string;
  country_code: string;
  lat?: number;
  lon?: number;
}

interface AppContextType {
  favoriteAirports: Airport[];
  toggleFavorite: (airport: Airport) => Promise<void>;
  user: User | null;
  posts: Post[];
  invites: Invite[];
  reports: ReportItem[];
  selectedAirport: Airport;
  setSelectedAirport: (airport: Airport) => void;
  addPost: (post: Post) => void;
  updatePost: (post: Post) => void;
  addInvite: (invite: Invite) => void;
  removeInvite: (id: string) => void;
  resolveReport: (id: string) => void;
  addComment: (postId: string, text: string) => void;
  logAudit: (action: string, targetType: string, targetId: string, details: any) => Promise<void>;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, phone?: string, avatarUrl?: string) => Promise<void>;
  signOut: () => Promise<void>;
  confirmPostValidity: (postId: string) => Promise<any>;
  reportPost: (postId: string, reason: string, comment?: string, contact?: string) => Promise<any>;
  createComment: (postId: string, content: string) => Promise<any>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Default fallback airport (Curitiba)
const DEFAULT_AIRPORT: Airport = {
  id: 'a5443645-bca0-4e8d-9a2a-85a4e69e8f85',
  icao: 'SBCT',
  name: 'Afonso Pena Intl',
  city: 'Curitiba',
  state: 'PR',
  country_code: 'BR'
};

export const AppProvider = ({ children }: React.PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [invites, setInvites] = useState<Invite[]>(INITIAL_INVITES);
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS);
  const [selectedAirport, setSelectedAirport] = useState<Airport>(DEFAULT_AIRPORT);
  const [favoriteAirports, setFavoriteAirports] = useState<Airport[]>([]);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
        fetchFavorites(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id, session.user.email);
        fetchFavorites(session.user.id);
      } else {
        setUser(null);
        setFavoriteAirports([]);
      }
    });

    fetchPosts();

    return () => subscription.unsubscribe();
  }, [selectedAirport]); // Refetch when airport changes

  const fetchFavorites = async (uid: string) => {
    try {
      // Need to join user_favorites with airports
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          airport_id,
          airports (*)
        `)
        .eq('user_id', uid);

      if (error) {
        console.error('Error fetching favorites:', error);
        return;
      }

      if (data) {
        const favs = data.map((item: any) => item.airports); // Flatten
        setFavoriteAirports(favs);
      }
    } catch (e) {
      console.error('Exception fetching favorites:', e);
    }
  };

  const toggleFavorite = async (airport: Airport) => {
    if (!user) return;
    const isFav = favoriteAirports.some(a => a.id === airport.id);

    if (isFav) {
      // Remove
      setFavoriteAirports(prev => prev.filter(a => a.id !== airport.id));
      await supabase.from('user_favorites').delete().match({ user_id: user.id, airport_id: airport.id });
    } else {
      // Add
      setFavoriteAirports(prev => [...prev, airport]);
      await supabase.from('user_favorites').insert({ user_id: user.id, airport_id: airport.id });
    }
  };

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:user_profiles!author_auth_uid (
            full_name,
            avatar_url,
            role_id,
            callsign
          ),
          media:post_media (
            storage_path
          )
        `)
        .order('created_at', { ascending: false });

      if (selectedAirport.id !== 'default') {
        query = query.eq('airport_id', selectedAirport.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      if (data) {
        const realPosts: Post[] = data.map((p: any) => {
          let imageUrl = undefined;
          if (p.media && p.media.length > 0) {
            const { data: urlData } = supabase.storage
              .from('post-media')
              .getPublicUrl(p.media[0].storage_path);
            imageUrl = urlData.publicUrl;
          }

          return {
            id: p.id,
            type: 'collaborative',
            user: {
              id: p.author_auth_uid,
              name: p.user?.callsign || p.user?.full_name || 'Desconhecido',
              avatar: p.user?.avatar_url || IMAGES.profileMain,
              role: p.user?.role_id || 'registered'
            },
            category: p.category || 'Geral',
            title: p.title || p.description?.substring(0, 20) || 'Sem título',
            description: p.description,
            image: imageUrl,
            timestamp: new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + 'Z',
            likes: 0,
            comments: []
          };
        });

        const official = INITIAL_POSTS.find(p => p.type === 'official');
        const others = INITIAL_POSTS.filter(p => p.type !== 'official');

        if (official) {
          setPosts([official, ...realPosts, ...others]);
        } else {
          setPosts([...realPosts, ...INITIAL_POSTS]);
        }
      }
    } catch (err) {
      console.error("Unexpected error fetching posts:", err);
    }
  };

  const fetchProfile = async (uid: string, sessionEmail?: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('auth_uid', uid)
      .single();

    if (error || !data) {
      console.error('Error fetching profile:', error);
      // Fallback: create temporary user state from session so they are not "logged out"
      if (sessionEmail) {
        setUser({
          id: uid,
          name: 'Usuário (Perfil Pendente)',
          avatar: IMAGES.profileMain,
          role: 'registered',
          email: sessionEmail
        });
      }
      return;
    }

    setUser({
      id: uid,
      name: data.full_name || 'Usuário',
      avatar: data.avatar_url || IMAGES.profileMain,
      role: data.role_id,
      callsign: data.callsign,
      email: data.email, // Now guaranteed by sync trigger or initial insert
      phone: data.phone
    });
  };

  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const signUp = async (email: string, pass: string, name: string, phone?: string, avatarUrl?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: name,
          phone: phone,
          avatar_url: avatarUrl
        }
      }
    });
    if (error) throw error;
    // Profile creation is handled by DB Trigger handle_new_user
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const logAudit = async (action: string, targetType: string, targetId: string, details: any) => {
    if (!user) return;
    try {
      await supabase.from('audit_logs').insert({
        actor_auth_uid: user.id,
        action: action,
        target_type: targetType,
        target_id: targetId,
        metadata: details,
        created_at: new Date()
      });
    } catch (e) {
      console.error("Audit log failed", e);
    }
  };

  const addPost = (post: Post) => {
    setPosts([post, ...posts]);
  };

  const updatePost = (updatedPost: Post) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const addInvite = (invite: Invite) => {
    setInvites([invite, ...invites]);
  };

  const removeInvite = (id: string) => {
    setInvites(invites.filter(i => i.id !== id));
  };

  const resolveReport = (id: string) => {
    setReports(reports.filter(r => r.id !== id));
  };

  const addComment = (postId: string, text: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, {
            id: Math.random().toString(36).substr(2, 9),
            text,
            timestamp: 'Agora',
            user: user || { id: 'anon', name: 'Anônimo', avatar: IMAGES.avatar1 }
          }]
        };
      }
      return post;
    }));
  };

  const confirmPostValidity = async (postId: string) => {
    if (!user) return;
    const { data, error } = await supabase.rpc('confirm_post', { p_post_id: postId });
    if (error) throw error;
    return data;
  };

  const reportPost = async (postId: string, reason: string, comment?: string, contact?: string) => {
    if (!user) return;
    const { data, error } = await supabase.rpc('report_post', {
      p_post_id: postId,
      p_reason: reason,
      p_comment: comment,
      p_reporter_contact: contact
    });
    if (error) throw error;
    return data;
  };

  const createComment = async (postId: string, content: string) => {
    if (!user) return;
    // Optimistic UI update is handled in the component or we can refetch/update local state here
    // For now, let's just make the RPC call and return the result
    const { data, error } = await supabase.rpc('create_post_comment', {
      p_post_id: postId,
      p_content: content
    });

    if (error) throw error;

    // Update local state if successful to show comment immediately
    // Note: data contains the new comment object
    if (data) {
      // Helper to format timestamp if needed, but the object comes from DB
      // We might need to adapt it slightly to match the client Post structure if it differs
      // Current client Post.comments structure: {id, user, text, timestamp}
      // RPC returns: {id, post_id, content, created_at, user: {id, name, avatar}}
      const newComment = {
        id: data.id,
        text: data.content,
        timestamp: 'Agora', // or format data.created_at
        user: {
          id: data.user.id,
          name: data.user.name,
          avatar: data.user.avatar || IMAGES.profileMain
        }
      };

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...post.comments, newComment]
          };
        }
        return post;
      }));
    }

    return data;
  };

  return (
    <AppContext.Provider value={{
      user, posts, invites, reports, selectedAirport, setSelectedAirport,
      addPost, updatePost, addInvite, removeInvite, resolveReport, addComment,
      signIn, signUp, signOut, logAudit, favoriteAirports, toggleFavorite,
      confirmPostValidity, reportPost, createComment
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};