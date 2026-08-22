-- Seed script run manually in Supabase SQL editor

DO $$ 
DECLARE 
  new_driver_id uuid;
BEGIN
  -- Insert driver
  INSERT INTO drivers (driver_code, name) 
  VALUES ('DRV001', 'Test Driver') 
  RETURNING id INTO new_driver_id;
  
  -- Insert trip
  INSERT INTO trips (driver_id, facility_name, status) 
  VALUES (new_driver_id, 'Test Facility', 'active');
END $$;
