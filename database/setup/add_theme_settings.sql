-- Migrasi untuk Advanced Theming System
-- Membuat tabel system_settings jika belum ada

CREATE TABLE IF NOT EXISTS public.system_settings (
    id SERIAL PRIMARY KEY,
    current_theme VARCHAR(255) DEFAULT 'paper-white' NOT NULL,
    dark_mode_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    dark_mode_preference VARCHAR(50) DEFAULT 'system' NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    inputter VARCHAR(255) DEFAULT 'System',
    inputter_tms TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Memasukkan data awal (seed) jika tabel masih kosong
INSERT INTO public.system_settings (current_theme, dark_mode_enabled, dark_mode_preference)
SELECT 'paper-white', FALSE, 'system'
WHERE NOT EXISTS (
    SELECT 1 FROM public.system_settings LIMIT 1
);
