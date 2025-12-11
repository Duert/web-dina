-- SEED DATA: Dummy Group for Testing

WITH new_group AS (
    INSERT INTO registrations (group_name, category)
    VALUES ('Escuela de Danza DEMO', 'Juvenil')
    RETURNING id
),
new_responsible AS (
    INSERT INTO registration_responsibles (registration_id, name, surnames, phone, email)
    SELECT id, 'Laura', 'Directora', '600123456', 'laura@demo.com'
    FROM new_group
)
INSERT INTO registration_participants (registration_id, name, surnames, dob, num_tickets)
SELECT 
    (SELECT id FROM new_group), 
    'Bailarín', 
    'Prueba ' || s.id, 
    '2010-01-01', 
    1
FROM generate_series(1, 25) AS s(id);
