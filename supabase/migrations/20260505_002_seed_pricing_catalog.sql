-- Seed: Phoenix-market pricing catalog (~80 items across 8 categories + universal)
-- Per docs/06-assumptions.md "Synthetic catalog skeleton".
-- Source-of-truth mirrors lib/mocks/catalog.ts so frontend mocks and DB stay aligned
-- until Marcus's real spreadsheet is ingested (replaceability map, docs/06-assumptions.md).

-- Idempotent: clears existing seeded rows by name match, then inserts.
-- Safe to re-run.

begin;

-- Re-runnable seed: only delete items with the seed names we are about to insert.
-- (We don't truncate the whole table because Marcus might add custom items later.)
delete from greenscape.line_items
 where name in (
  -- Patio
  'Travertine paver patio — premium grade',
  'Flagstone patio — natural cut',
  'Concrete paver patio',
  'Stamped concrete patio',
  'Caliche-resistant base prep (patio)',
  'Existing concrete demo + haul',
  'Patio drainage install',
  'Decorative paver border',
  -- Pergola
  'Cedar pergola 12×12',
  'Cedar pergola 16×16',
  'Aluminum pergola 12×12',
  'Steel powder-coat pergola 12×14',
  'Pergola lighting package',
  'Retractable canopy add-on',
  'Pergola privacy screen',
  -- Fire pit
  'Gas fire pit 36" round',
  'Gas fire pit 48"×24" rectangular',
  'Wood-burning flagstone fire pit',
  'Linear gas fire feature 6 ft',
  'Wood→gas fire pit conversion',
  'Fire pit gas line trench',
  -- Water feature
  'Pondless waterfall — small (3-5 ft)',
  'Pondless waterfall — medium (6-8 ft)',
  'Pond w/ waterfall',
  'Bubbling rock fountain',
  'Sheer-descent water wall 4 ft',
  -- Artificial turf
  'Premium artificial turf 75oz pet/play',
  'Standard artificial turf 50oz',
  'Putting green artificial turf',
  'Caliche-resistant base prep (turf)',
  'Existing grass removal + haul',
  -- Irrigation
  'Drip irrigation zone',
  'Pop-up sprinkler zone',
  'Smart irrigation controller (Rachio)',
  'Rain sensor add-on',
  'Backflow preventer install',
  'Irrigation audit / repair labor',
  -- Outdoor kitchen
  'L-shaped grill island 8 ft (stucco)',
  'Linear outdoor kitchen 10 ft (stone veneer)',
  'Built-in grill insert',
  'Granite countertop',
  'Outdoor refrigerator',
  'Outdoor sink + plumbing',
  -- Retaining wall
  'Block retaining wall 24"',
  'Block retaining wall 36"',
  'Engineered retaining wall 48"',
  'Boulder retaining wall',
  'Stucco-finish concrete retaining wall',
  'Retaining wall cap stones',
  'Drainage behind retaining wall',
  'Engineering stamp (>36" wall)',
  -- Universal
  'Phoenix permit pull',
  'HOA submission package',
  'Final cleanup + haul',
  '3D rendering (>$30K projects)',
  'Project management overhead',
  -- Allowances (research Q6 — known-unknowns priced as allowances)
  'Lighting fixture allowance',
  'Plant material allowance'
);

-- item_type defaults to 'fixed' (per migration 003); allowance items are inserted in a
-- separate INSERT below per research Q6 (known-unknowns customer chooses inside the
-- allowance, change-order on overage).
insert into greenscape.line_items (category, name, description, unit, unit_price, material_cost_pct) values
  -- Patio
  ('patio',          'Travertine paver patio — premium grade',  'Premium-grade travertine pavers; sand-set on compacted base.',         'sq_ft',     22.00, 0.45),
  ('patio',          'Flagstone patio — natural cut',           'Natural-cut flagstone, mortared joints.',                              'sq_ft',     28.00, 0.50),
  ('patio',          'Concrete paver patio',                    'Standard concrete pavers, sand-set.',                                  'sq_ft',     14.00, 0.40),
  ('patio',          'Stamped concrete patio',                  'Poured + stamped concrete with color stain.',                          'sq_ft',     12.00, 0.35),
  ('patio',          'Caliche-resistant base prep (patio)',     'Sub-grade prep including caliche removal.',                            'sq_ft',      4.00, 0.30),
  ('patio',          'Existing concrete demo + haul',           'Demolition and disposal of existing slab.',                            'sq_ft',      3.50, 0.20),
  ('patio',          'Patio drainage install',                  'French drain or trench drain for patio runoff.',                       'lump_sum', 850.00, 0.40),
  ('patio',          'Decorative paver border',                 'Soldier-course paver border.',                                         'linear_ft', 18.00, 0.45),

  -- Pergola
  ('pergola',        'Cedar pergola 12×12',                     'Western red cedar, sealed.',                                           'each',    7800.00, 0.50),
  ('pergola',        'Cedar pergola 16×16',                     'Western red cedar, sealed.',                                           'each',   12500.00, 0.50),
  ('pergola',        'Aluminum pergola 12×12',                  'Powder-coat aluminum frame.',                                          'each',    6200.00, 0.55),
  ('pergola',        'Steel powder-coat pergola 12×14',         'Heavy-gauge steel, powder-coat finish.',                               'each',   11500.00, 0.55),
  ('pergola',        'Pergola lighting package',                'Low-voltage LED downlights and string-light wiring.',                  'each',    1800.00, 0.40),
  ('pergola',        'Retractable canopy add-on',               'Manual retractable canopy.',                                           'each',    2400.00, 0.55),
  ('pergola',        'Pergola privacy screen',                  'Slatted side panels.',                                                 'linear_ft', 95.00, 0.45),

  -- Fire pit
  ('fire_pit',       'Gas fire pit 36" round',                  'Stainless ring burner, river rock fill.',                              'each',    3400.00, 0.45),
  ('fire_pit',       'Gas fire pit 48"×24" rectangular',        'Linear gas burner, glass beads.',                                      'each',    4800.00, 0.45),
  ('fire_pit',       'Wood-burning flagstone fire pit',         'Dry-stack flagstone surround.',                                        'each',    2200.00, 0.40),
  ('fire_pit',       'Linear gas fire feature 6 ft',            '6-ft linear burner with fire glass.',                                  'each',    5600.00, 0.50),
  ('fire_pit',       'Wood→gas fire pit conversion',            'Convert existing wood pit to gas.',                                    'each',    1400.00, 0.30),
  ('fire_pit',       'Fire pit gas line trench',                'Trench + line from manifold.',                                         'linear_ft', 32.00, 0.40),

  -- Water feature
  ('water_feature',  'Pondless waterfall — small (3-5 ft)',     'Self-contained pondless waterfall.',                                   'each',    4800.00, 0.50),
  ('water_feature',  'Pondless waterfall — medium (6-8 ft)',    'Mid-scale pondless waterfall.',                                        'each',    7500.00, 0.50),
  ('water_feature',  'Pond w/ waterfall',                       'Lined pond, biofilter, waterfall.',                                    'each',    9200.00, 0.50),
  ('water_feature',  'Bubbling rock fountain',                  'Disappearing fountain over basalt column.',                            'each',    1200.00, 0.45),
  ('water_feature',  'Sheer-descent water wall 4 ft',           'Stainless sheer-descent over LED-lit wall.',                           'each',    3400.00, 0.50),

  -- Artificial turf
  ('artificial_turf','Premium artificial turf 75oz pet/play',   '75oz face-weight, pet- and play-rated turf, installed.',               'sq_ft',      9.50, 0.55),
  ('artificial_turf','Standard artificial turf 50oz',           '50oz face-weight, residential-grade turf, installed.',                 'sq_ft',      7.25, 0.55),
  ('artificial_turf','Putting green artificial turf',           'Short-pile nylon putting surface, infilled.',                          'sq_ft',     13.00, 0.55),
  ('artificial_turf','Caliche-resistant base prep (turf)',      'Caliche removal and Class II base for turf.',                          'sq_ft',      2.50, 0.30),
  ('artificial_turf','Existing grass removal + haul',           'Sod cut + dispose.',                                                   'sq_ft',      1.80, 0.20),

  -- Irrigation
  ('irrigation',     'Drip irrigation zone',                    'New drip zone with emitters.',                                         'zone',     450.00, 0.40),
  ('irrigation',     'Pop-up sprinkler zone',                   'New pop-up zone, MP rotators.',                                        'zone',     380.00, 0.40),
  ('irrigation',     'Smart irrigation controller (Rachio)',    'WiFi-connected smart controller.',                                     'each',     480.00, 0.50),
  ('irrigation',     'Rain sensor add-on',                      'Wireless rain sensor.',                                                'each',     180.00, 0.40),
  ('irrigation',     'Backflow preventer install',              'Code-compliant backflow assembly.',                                    'each',     320.00, 0.45),
  ('irrigation',     'Irrigation audit / repair labor',         'Labor for audit, leaks, head replacement.',                            'hour',     125.00, 0.10),

  -- Outdoor kitchen
  ('outdoor_kitchen','L-shaped grill island 8 ft (stucco)',     'Stucco-finish L-island with bar overhang.',                            'each',    8800.00, 0.50),
  ('outdoor_kitchen','Linear outdoor kitchen 10 ft (stone veneer)', 'Stone-veneer linear kitchen, 10 ft.',                              'each',   14500.00, 0.55),
  ('outdoor_kitchen','Built-in grill insert',                   'Premium 36" stainless grill insert.',                                  'each',    3200.00, 0.65),
  ('outdoor_kitchen','Granite countertop',                      'Slab granite countertop, edged + sealed.',                             'linear_ft',145.00, 0.55),
  ('outdoor_kitchen','Outdoor refrigerator',                    'UL-rated outdoor mini fridge.',                                        'each',    1800.00, 0.65),
  ('outdoor_kitchen','Outdoor sink + plumbing',                 'Under-counter sink + cold-water hookup.',                              'each',    1200.00, 0.50),

  -- Retaining wall
  ('retaining_wall', 'Block retaining wall 24"',                'Block wall ≤24" tall, with cap.',                                      'linear_ft', 85.00, 0.45),
  ('retaining_wall', 'Block retaining wall 36"',                'Block wall ≤36" tall, with cap.',                                      'linear_ft',125.00, 0.45),
  ('retaining_wall', 'Engineered retaining wall 48"',           'Engineered wall ≤48" with rebar + drainage.',                          'linear_ft',185.00, 0.50),
  ('retaining_wall', 'Boulder retaining wall',                  'Natural boulder wall, dry-stacked.',                                   'linear_ft',145.00, 0.40),
  ('retaining_wall', 'Stucco-finish concrete retaining wall',   'Poured concrete wall with stucco finish.',                             'linear_ft',165.00, 0.45),
  ('retaining_wall', 'Retaining wall cap stones',               'Cap stones across top of wall.',                                       'linear_ft', 22.00, 0.50),
  ('retaining_wall', 'Drainage behind retaining wall',          'Perforated pipe + gravel pack.',                                       'linear_ft', 35.00, 0.40),
  ('retaining_wall', 'Engineering stamp (>36" wall)',           'PE-stamped wall calc/drawings.',                                       'lump_sum', 850.00, 0.10),

  -- Universal
  ('universal',      'Phoenix permit pull',                     'Municipal permit fee + pull labor.',                                   'lump_sum', 325.00, 0.20),
  ('universal',      'HOA submission package',                  'Drawings + submittal package for HOA review.',                         'lump_sum', 450.00, 0.10),
  ('universal',      'Final cleanup + haul',                    'Final site clean and dump-run.',                                       'lump_sum', 650.00, 0.30),
  ('universal',      '3D rendering (>$30K projects)',           '3D render of finished design (Carlos).',                               'lump_sum', 850.00, 0.05),
  ('universal',      'Project management overhead',             'PM overhead at 8% of subtotal (entered as lump-sum at quote time).',   'lump_sum',   0.00, 0.00);

-- Allowance items (research Q6) — customer makes the choice inside the allowance;
-- overage is a change order. Default unit_price is a placeholder allowance amount.
insert into greenscape.line_items (category, name, description, unit, unit_price, material_cost_pct, item_type) values
  ('universal', 'Lighting fixture allowance', 'Allowance for low-voltage outdoor lighting fixtures; customer selects inside the allowance.', 'lump_sum', 1200.00, 0.55, 'allowance'),
  ('universal', 'Plant material allowance',   'Allowance for plant material (drought-tolerant, Phoenix-appropriate); customer selects inside the allowance.', 'lump_sum', 950.00, 0.50, 'allowance');

-- Sample customers for demo + dev use.
delete from greenscape.customers where email in (
  'demo+1@example.com','demo+2@example.com','demo+3@example.com','demo+4@example.com','demo+5@example.com'
);

insert into greenscape.customers (name, email, phone, address) values
  ('Hannah Patel',    'demo+1@example.com', '+1 480 555 0101', '14021 N Tatum Blvd, Phoenix, AZ 85032'),
  ('David Chen',      'demo+2@example.com', '+1 602 555 0142', '5610 E Camelback Rd, Scottsdale, AZ 85251'),
  ('Maria Lopez',     'demo+3@example.com', '+1 480 555 0188', '8920 E Jackrabbit Ln, Paradise Valley, AZ 85253'),
  ('James Whitaker',  'demo+4@example.com', '+1 602 555 0233', '2155 W Glendale Ave, Phoenix, AZ 85021'),
  ('Sophie & Ben Lin','demo+5@example.com', '+1 480 555 0277', '7711 E Doubletree Ranch Rd, Scottsdale, AZ 85258');

commit;
