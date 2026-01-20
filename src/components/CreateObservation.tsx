import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, Airport } from '../AppContext';
import { IMAGES } from '../constants';
import { supabase } from '../supabaseClient';
import imageCompression from 'browser-image-compression';
import { getWeather } from '../services/weatherService';

const CreateObservation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, selectedAirport: globalAirport, addPost, updatePost } = useApp();

  useEffect(() => {
    if (user && user.role === 'registered') {
      alert('Apenas Colaboradores podem criar posts.');
      navigate('/feed');
    }
  }, [user]);

  // Determine if editing
  const editingPost = location.state?.post;
  const isEditing = !!editingPost;

  // Local state initialized with existing post data if available
  const [description, setDescription] = useState(editingPost?.description || "");
  const [title, setTitle] = useState(editingPost?.title || "");
  const [category, setCategory] = useState(editingPost?.category || "Outros");
  const [area, setArea] = useState(editingPost?.area || "Pista");
  const [showToast, setShowToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New state for quick actions
  const setQuickReport = (type: string) => {
    switch (type) {
      case 'FOD':
        setTitle('Objeto estranho (FOD)');
        setCategory('FOD');
        setDescription('FOD identificado na área de movimento. Requer inspeção.');
        break;
      case 'BIRDS':
        setTitle('Atividade Aviária');
        setCategory('Security'); // or specific Birds category
        setDescription('Bando de pássaros avistado nas imediações da pista.');
        break;
      case 'TURB':
        setTitle('Turbulência Moderada');
        setCategory('Clima');
        setDescription('Reporte de turbulência moderada na aproximação.');
        break;
    }
    // Optionally auto-scroll to send or highlight fields
  };

  // Airport Context Local State (initially global, or from post if editing)
  // If editing, we need to fetch the airport object if not in list? 
  // For simplicity, we assume we can stick to current global or try to match?
  // Ideally if editing, we shouldn't change airport easily or we should fallback to global. 
  // Let's stick to global for new, but if editing, keep previous airport ID in mind?
  // Actually, UI allows changing airport.
  // We'll initialize localAirport to global for now. If editing, we might need logic to fetch that airport name.
  // But let's assume user is editing on valid context.
  const [localAirport, setLocalAirport] = useState<Airport>(globalAirport);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Airport[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Camera / Image State
  // If editing, we might have an image already.
  // Use previewUrl from post.image (which is publicUrl).
  // photoFile remains null unless user picks NEW one.
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    (isEditing && editingPost.media && editingPost.media[0]?.storage_path)
      // Wait, listing query returns media: [{storage_path}]. We need public URL.
      // But Feed/UserPostList might pass the ALREADY RESOLVED 'image' prop if we passed the mapped object?
      // UserPostList fetches raw data with media relation.
      // In UserPostList: `posts` state has `media: post_media(...)`.
      // It does NOT have `image` property with full URL unless we mapped it.
      // Let's check UserPostList again. It maps raw data? No, it uses `data` directly.
      // So `post` passed in state will have `media` array.
      // We need to generate the URL for preview if valid.
      ? supabase.storage.from('post-media').getPublicUrl(editingPost.media[0].storage_path).data.publicUrl
      : IMAGES.cameraPreview
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  // ... (keeping existing code)

  const handleTriggerCamera = () => {
    fileInputRef.current?.click();
  };

  const handleTriggerLibrary = () => {
    libraryInputRef.current?.click();
  };
  // Time State
  const [timeZ, setTimeZ] = useState("");

  useEffect(() => {
    // Update Zulu time every minute
    const updateTime = () => {
      const now = new Date();
      const hours = now.getUTCHours().toString().padStart(2, '0');
      const minutes = now.getUTCMinutes().toString().padStart(2, '0');
      setTimeZ(`${hours}:${minutes}Z`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Weather State
  const [weather, setWeather] = useState<{ wind: string; flight_category: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchWeather = async () => {
      if (localAirport?.icao) {
        try {
          // Import dynamically or if imported at top, just usage:
          const data = await getWeather(localAirport.icao);
          if (mounted && data) {
            // Only show wind if valid (not undefined)
            const wind = (data.wind_dir_degrees !== undefined && data.wind_speed_kt !== undefined)
              ? `${data.wind_dir_degrees.toString().padStart(3, '0')}@${data.wind_speed_kt}KT`
              : null; // Changed to null to indicate no data

            // If string is constructed but effectively "NaN@NaNKT" or similar logic could go here depending on API

            setWeather({
              wind: wind || '', // Pass empty string if null, handle in UI
              flight_category: data.flight_category || 'N/A'
            });
          }
        } catch (err) {
          console.error("Failed to fetch weather for overlay", err);
        }
      }
    };
    fetchWeather();
    return () => { mounted = false; };
  }, [localAirport]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };



  // Voice Recognition
  const [isListening, setIsListening] = useState(false);
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Reconhecimento de voz não suportado neste dispositivo.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      console.error("Speech error", event);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setDescription(prev => {
          const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
          return prev + separator + transcript.charAt(0).toUpperCase() + transcript.slice(1);
        });
      }
    };

    recognition.start();
  };

  // Canvas Overlay Function
  const addOverlayToImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Resize behavior: limit max dimension to 1920 to save memory/time, 
        // similar to what compression would do, but we do it here for drawing.
        const maxDim = 1920;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw Image
        ctx.drawImage(img, 0, 0, width, height);

        // --- DRAW OVERLAY ---
        // Gradient for readability at bottom
        const grad = ctx.createLinearGradient(0, height - (height * 0.3), 0, height);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, height - (height * 0.3), width, height * 0.3);

        // Text Settings
        const fontSize = Math.floor(height * 0.04); // Responsive font size
        const padding = Math.floor(height * 0.03);

        ctx.font = `bold ${fontSize}px 'Courier New', monospace`; // Monospace for technical look
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'bottom';

        // Left Info: Airport + Time
        const dateStr = new Date().toLocaleDateString('pt-BR');
        const leftLine1 = `${localAirport.icao} • ${timeZ}`;
        const leftLine2 = dateStr;

        ctx.textAlign = 'left';
        ctx.fillText(leftLine1, padding, height - padding - (fontSize * 1.2));
        ctx.font = `${fontSize * 0.8}px 'Courier New', monospace`;
        ctx.fillStyle = '#CCCCCC';
        ctx.fillText(leftLine2, padding, height - padding);

        // Right Info: Weather
        ctx.textAlign = 'right';
        ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
        ctx.fillStyle = weather?.flight_category === 'VFR' ? '#4ade80' :
          weather?.flight_category === 'IFR' ? '#f87171' : '#FFFFFF';

        if (weather && weather.wind) {
          const windText = `VENTO: ${weather.wind}`;
          ctx.fillText(windText, width - padding, height - padding - (fontSize * 1.2));
        }

        // Observer "Watermark" top center or corner
        ctx.font = `bold ${fontSize * 0.8}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.textAlign = 'right';
        ctx.fillText("EVIDÊNCIA OBSERVER", width - padding, padding + fontSize);

        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name, { type: 'image/jpeg' });
            resolve(newFile);
          } else {
            reject(new Error("Canvas to Blob failed"));
          }
        }, 'image/jpeg', 0.90);
      };
      img.onerror = (e) => reject(e);
      img.src = objectUrl;
    });
  };

  const handleSend = async () => {
    if (!description) {
      alert("Por favor, adicione uma descrição.");
      return;
    }
    if (!user) {
      alert("Você precisa estar logado.");
      return;
    }

    setIsSubmitting(true);

    try {
      let imagePath = null;
      let publicUrl = previewUrl;

      // 1. Upload Image logic
      if (photoFile) {
        // Validation: Max 10MB (allow larger initial, we compress)
        if (photoFile.size > 10 * 1024 * 1024) {
          throw new Error("A imagem deve ter no máximo 10MB.");
        }

        // *** APPLY SMART OVERLAY ***
        // We burn the data into the image BEFORE compression to ensure it's legible
        let proccessedFile = photoFile;
        try {
          proccessedFile = await addOverlayToImage(photoFile);
        } catch (overlayErr) {
          console.warn("Could not apply overlay, using original", overlayErr);
        }

        // Compression 
        const options = {
          maxSizeMB: 1, // Compress to ~1MB
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8,
        };

        let compressedFile = proccessedFile;
        try {
          compressedFile = await imageCompression(proccessedFile, options);
        } catch (cErr) {
          console.warn("Compression failed, using processed", cErr);
        }

        const fileExt = 'jpg'; // We converted to jpeg in canvas
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;

        imagePath = filePath;
        const { data } = supabase.storage.from('post-media').getPublicUrl(filePath);
        publicUrl = data.publicUrl;
      }

      let resultId = null;

      if (isEditing) {
        // UPDATE Existing Post
        const { error: updateError } = await supabase
          .from('posts')
          .update({
            airport_id: localAirport.id,
            area: area,
            category: category,
            title: title || `${category} em ${area}`,
            description: description,
          })
          .eq('id', editingPost.id);

        if (updateError) throw updateError;
        resultId = editingPost.id;

        // Update Media if new file
        if (imagePath) {
          const { error: mediaError } = await supabase
            .from('post_media')
            .insert({
              post_id: resultId,
              storage_path: imagePath,
              media_type: 'image'
            });
          if (mediaError) throw mediaError;
        }

      } else {
        // INSERT New Post
        const { data: postData, error: insertError } = await supabase
          .from('posts')
          .insert({
            author_auth_uid: user.id,
            airport_id: localAirport.id,
            area: area,
            category: category,
            title: title || `${category} em ${area}`,
            description: description,
            status: 'published'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (!postData) throw new Error("No data returned from post insert");

        resultId = postData.id;

        // 3. Insert Media (if exists)
        if (imagePath && resultId) {
          const { error: mediaError } = await supabase
            .from('post_media')
            .insert({
              post_id: resultId,
              storage_path: imagePath,
              media_type: 'image'
            });

          if (mediaError) throw mediaError;
        }
      }

      // 4. Update Local State (Optimistic or just for feedback)
      const newPost = {
        id: resultId,
        type: 'collaborative',
        user: {
          id: user.id,
          name: user.callsign || user.name || 'Usuário',
          avatar: user.avatar || IMAGES.profileMain,
          role: user.role || 'registered',
          job_title: user.job_title
        },
        category: category,
        title: title || `${category} em ${area}`,
        description: description,
        image: publicUrl,
        timestamp: (() => {
          const d = new Date();
          return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}Z`;
        })(),
        likes: 0,
        comments: []
      };

      if (isEditing) {
        updatePost(newPost);
      } else {
        addPost(newPost);
      }

      setShowToast(true);
      setTimeout(() => {
        // Navigate back (either -1 or feed)
        // If from UserPostList (-1), goes back to list.
        navigate(-1);
      }, 1500);

    } catch (error: any) {
      console.error("Error submitting post:", error);
      alert("Erro ao enviar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center p-4 justify-between max-w-md mx-auto w-full">
          <div className="w-12 flex items-center cursor-pointer" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined text-slate-900 dark:text-white">close</span>
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-bold leading-tight tracking-tight">{isEditing ? 'Editar Observação' : 'Criar Observação'}</h2>
            <span className="text-xs font-mono text-primary font-bold">{timeZ}</span>
          </div>
          <div className="flex w-12 items-center justify-end">
            <button className="text-primary text-base font-semibold" onClick={() => navigate(-1)}>Cancelar</button>
          </div>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1">
          <div className="bg-primary h-1 w-3/4 transition-all duration-500"></div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto pb-32">
        {/* Camera Preview Area */}
        <div className="relative aspect-[4/3] bg-black overflow-hidden group">
          <img className="w-full h-full object-cover opacity-90" src={previewUrl} alt="Camera View" />

          {/* Smart Overlay UI - What you see is what you get (roughly) */}
          <div className="absolute top-4 right-4 text-right z-10 opacity-70">
            <div className="text-white font-bold text-xs">EVIDÊNCIA OBSERVER</div>
          </div>

          <div className="absolute bottom-20 left-4 right-4 z-10 pointer-events-none">
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-white font-bold font-mono text-xl drop-shadow-md">{localAirport.icao} • {timeZ}</span>
                <span className="text-slate-300 font-mono text-sm drop-shadow-md">{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex flex-col items-end">
                {weather?.wind && (
                  <div className={`font-bold font-mono text-xl drop-shadow-md ${weather?.flight_category === 'VFR' ? 'text-green-400' : weather?.flight_category === 'IFR' ? 'text-red-400' : 'text-white'}`}>
                    VENTO: {weather.wind}
                  </div>
                )}
              </div>
            </div>
          </div>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            ref={libraryInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={handleTriggerLibrary}
                className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/20 backdrop-blur-md text-white border border-white/30 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined">image</span>
              </button>
              <button
                onClick={handleTriggerCamera}
                className="flex shrink-0 items-center justify-center rounded-full size-20 bg-white text-primary shadow-xl active:scale-90 transition-transform"
              >
                <span className="material-symbols-outlined !text-4xl fill-1">photo_camera</span>
              </button>
              <button
                onClick={() => setPreviewUrl(IMAGES.cameraPreview)}
                className="flex shrink-0 items-center justify-center rounded-full size-12 bg-white/20 backdrop-blur-md text-white border border-white/30 active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Airport Selector */}
          <div className="flex flex-col gap-2 relative">
            <label className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">Aeroporto (ICAO)</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">flight_takeoff</span>
              <input
                className="w-full pl-12 pr-4 py-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent text-lg font-semibold uppercase placeholder-slate-300"
                placeholder={localAirport.icao}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                onFocus={() => setSearchResults([])}
              />
              {/* Show current selection if creating for it, user can type to change */}
              {!searchQuery && (
                <span className="absolute left-12 top-1/2 -translate-y-1/2 text-lg font-bold pointer-events-none text-slate-900 dark:text-white">
                  {localAirport.icao}
                </span>
              )}
            </div>

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-20 left-0 right-0 z-20 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {searchResults.map(ap => (
                  <div
                    key={ap.id}
                    onClick={() => {
                      setLocalAirport(ap);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between items-center cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <span className="font-bold">{ap.icao}</span>
                    <span className="text-xs text-slate-500 truncate max-w-[150px]">{ap.city}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">Área e Categoria</h3>
            <div className="flex h-12 items-center justify-center rounded-xl bg-slate-200 dark:bg-slate-800 p-1">
              {['Pista', 'Pátio', 'Taxiway'].map(loc => (
                <label key={loc} className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 has-[:checked]:bg-white dark:has-[:checked]:bg-slate-700 has-[:checked]:shadow-sm text-slate-600 dark:text-slate-400 has-[:checked]:text-primary font-bold text-sm transition-all">
                  <span className="truncate">{loc}</span>
                  <input
                    className="hidden"
                    name="area-picker"
                    type="radio"
                    checked={area === loc}
                    onChange={() => setArea(loc)}
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CategoryBtn icon="warning" label="FOD" active={category === 'FOD'} onClick={() => setCategory('FOD')} />
              <CategoryBtn icon="build" label="Manutenção" active={category === 'Manutenção'} onClick={() => setCategory('Manutenção')} />
              <CategoryBtn icon="lightbulb" label="Sinalização" active={category === 'Sinalização'} onClick={() => setCategory('Sinalização')} />
              <CategoryBtn icon="more_horiz" label="Outros" active={category === 'Outros'} onClick={() => setCategory('Outros')} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">Título</label>
            <input
              type="text"
              className="w-full pl-4 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent text-base font-medium placeholder-slate-300"
              placeholder="Ex: Buraco na pista, Iluminação falha..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between px-1 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Descrição</label>
                <button
                  onClick={startListening}
                  className={`flex items-center justify-center p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                  title="Falar descrição"
                >
                  <span className="material-symbols-outlined text-[18px]">{isListening ? 'mic_off' : 'mic'}</span>
                </button>
              </div>
              <span className="text-xs text-slate-400">{description.length} / 140</span>
            </div>
            <textarea
              className="w-full p-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              placeholder="Descreva o que você está observando..." rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={140}
            ></textarea>
          </div>

          <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">location_on</span>
              <div>
                <p className="font-bold">Incluir Geotag</p>
                <p className="text-xs text-slate-500">Coordenadas GPS automáticas</p>
              </div>
            </div>
            <div className="relative inline-block w-11 h-6 transition duration-200 ease-in-out rounded-full cursor-pointer">
              <input defaultChecked className="sr-only ios-toggle" id="toggle" type="checkbox" />
              <label className="ios-toggle-label absolute top-0 left-0 w-11 h-6 bg-slate-300 dark:bg-slate-700 rounded-full cursor-pointer transition-colors duration-200 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all" htmlFor="toggle"></label>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 max-w-[480px] w-full p-4 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 z-40">
        <button
          onClick={handleSend}
          disabled={isSubmitting}
          className={`w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined animate-spin">refresh</span>
              Enviando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">{isEditing ? 'save' : 'send'}</span>
              {isEditing ? 'Atualizar Observação' : 'Enviar Observação'}
            </>
          )}
        </button>
      </div>

      {showToast && (
        <div className="fixed bottom-24 left-4 right-4 z-50 flex justify-center pointer-events-none">
          <div className="bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm pointer-events-auto animate-bounce">
            <span className="material-symbols-outlined text-green-400">check_circle</span>
            <span className="text-sm font-medium flex-1">Observação {isEditing ? 'atualizada' : 'enviada'} com sucesso</span>
          </div>
        </div>
      )}
    </div>
  );
};

const CategoryBtn = ({ icon, label, active, onClick }: any) => {
  const activeClass = "border-primary bg-primary/10 text-primary";
  const inactiveClass = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300";
  return (
    <button onClick={onClick} className={`p-4 rounded-xl border-2 font-bold flex flex-col items-center gap-2 ${active ? activeClass : inactiveClass}`}>
      <span className="material-symbols-outlined">{icon}</span>
      {label}
    </button>
  )
}

export default CreateObservation;