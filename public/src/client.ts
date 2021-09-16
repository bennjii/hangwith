import { createClient } from '@supabase/supabase-js'
const supabase = createClient("https://iddqhofyjynlkargmixc.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYyOTE3NzQ0MywiZXhwIjoxOTQ0NzUzNDQzfQ.a4PIf_CT5H8dwY-rL5NKmfMs1b5qX9yAM11m-8wv4lg") 

export { supabase };