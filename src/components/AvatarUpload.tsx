import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { IMAGES } from '../constants';

interface AvatarUploadProps {
    url: string | null;
    onUpload: (url: string) => void;
    editable: boolean;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ url, onUpload, editable }) => {
    const [uploading, setUploading] = useState(false);

    const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

            onUpload(data.publicUrl);

        } catch (error: any) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative h-32 w-32">
                <div
                    className="h-32 w-32 rounded-full bg-cover bg-center border-4 border-white dark:border-gray-800 shadow-lg overflow-hidden"
                    style={{ backgroundImage: `url('${url || IMAGES.profileMain}')` }}
                >
                    {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white animate-spin">progress_activity</span>
                        </div>
                    )}
                </div>
                {editable && (
                    <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-blue-600 transition-colors" htmlFor="single">
                        <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                        <input
                            style={{
                                visibility: 'hidden',
                                position: 'absolute',
                            }}
                            type="file"
                            id="single"
                            accept="image/*"
                            onChange={uploadAvatar}
                            disabled={uploading}
                        />
                    </label>
                )}
            </div>
        </div>
    );
};

export default AvatarUpload;
