USE forum_music;

INSERT INTO tags (name, genre) VALUES
    ('Rock',        'Rock'),
    ('Jazz',        'Jazz'),
    ('Hip-hop',     'Hip-hop'),
    ('Classical',   'Classical'),
    ('Electronic',  'Electronic'),
    ('Pop',         'Pop'),
    ('Metal',       'Metal'),
    ('R&B',         'R&B'),
    ('Reggae',      'Reggae'),
    ('Blues',       'Blues'),
    ('Country',     'Country'),
    ('Punk',        'Punk'),
    ('Funk',        'Funk'),
    ('Latin',       'Latin'),
    ('Indie',       'Indie');

INSERT INTO artists (name) VALUES
    ('Kendrick Lamar'),
    ('Drake'),
    ('Kanye West'),
    ('Jay-Z'),
    ('Eminem'),
    ('Travis Scott'),
    ('J. Cole'),
    ('Cardi B'),
    ('Nicki Minaj'),
    ('21 Savage'),
    ('The Weeknd'),
    ('Frank Ocean'),
    ('Beyoncé'),
    ('Rihanna'),
    ('Bruno Mars'),
    ('Michael Jackson'),
    ('Prince'),
    ('Whitney Houston'),
    ('Marvin Gaye'),
    ('Stevie Wonder'),
    ('David Bowie'),
    ('Led Zeppelin'),
    ('Pink Floyd'),
    ('The Beatles'),
    ('The Rolling Stones'),
    ('Queen'),
    ('Nirvana'),
    ('Radiohead'),
    ('Arctic Monkeys'),
    ('The Strokes'),
    ('Daft Punk'),
    ('Aphex Twin'),
    ('The Chemical Brothers'),
    ('Kraftwerk'),
    ('Calvin Harris'),
    ('Bob Marley'),
    ('Damian Marley'),
    ('Lauryn Hill'),
    ('Miles Davis'),
    ('John Coltrane'),
    ('Louis Armstrong'),
    ('Billie Holiday'),
    ('Ella Fitzgerald'),
    ('Thelonious Monk'),
    ('Herbie Hancock'),
    ('B.B. King'),
    ('Muddy Waters'),
    ('Robert Johnson'),
    ('Jimi Hendrix'),
    ('Eric Clapton'),
    ('Johnny Cash'),
    ('Dolly Parton'),
    ('Willie Nelson'),
    ('James Brown'),
    ('Sly and the Family Stone'),
    ('Parliament-Funkadelic'),
    ('Bad Bunny'),
    ('J Balvin'),
    ('Shakira'),
    ('Marc Anthony'),
    ('Beethoven'),
    ('Mozart'),
    ('Bach');


INSERT INTO artist_tags (artist_id, tag_id) VALUES
    (1,  3),  -- Kendrick Lamar → Hip-hop
    (2,  3),  -- Drake          → Hip-hop
    (3,  3),  -- Kanye West     → Hip-hop
    (4,  3),  -- Jay-Z          → Hip-hop
    (5,  3),  -- Eminem         → Hip-hop
    (6,  3),  -- Travis Scott   → Hip-hop
    (7,  3),  -- J. Cole        → Hip-hop
    (8,  3),  -- Cardi B        → Hip-hop
    (9,  3),  -- Nicki Minaj    → Hip-hop
    (10, 3),  -- 21 Savage      → Hip-hop


    (11, 8),  -- The Weeknd     → R&B
    (12, 8),  -- Frank Ocean    → R&B
    (13, 8),  -- Beyoncé        → R&B
    (14, 8),  -- Rihanna        → R&B
    (19, 8),  -- Marvin Gaye    → R&B
    (20, 8),  -- Stevie Wonder  → R&B


    (13, 6),  -- Beyoncé        → Pop
    (14, 6),  -- Rihanna        → Pop
    (15, 6),  -- Bruno Mars     → Pop
    (16, 6),  -- Michael Jackson → Pop
    (18, 6),  -- Whitney Houston → Pop


    (21, 1),  -- David Bowie    → Rock
    (22, 1),  -- Led Zeppelin   → Rock
    (23, 1),  -- Pink Floyd     → Rock
    (24, 1),  -- The Beatles    → Rock
    (25, 1),  -- The Rolling Stones → Rock
    (26, 1),  -- Queen          → Rock
    (27, 1),  -- Nirvana        → Rock
    (49, 1),  -- Jimi Hendrix   → Rock
    (50, 1),  -- Eric Clapton   → Rock


    (28, 15), -- Radiohead      → Indie
    (29, 15), -- Arctic Monkeys → Indie
    (30, 15), -- The Strokes    → Indie


    (27, 12), -- Nirvana        → Punk


    (31, 5),  -- Daft Punk      → Electronic
    (32, 5),  -- Aphex Twin     → Electronic
    (33, 5),  -- The Chemical Brothers → Electronic
    (34, 5),  -- Kraftwerk      → Electronic
    (35, 5),  -- Calvin Harris  → Electronic


    (36, 9),  -- Bob Marley     → Reggae
    (37, 9),  -- Damian Marley  → Reggae
    (38, 9),  -- Lauryn Hill    → Reggae

    (39, 2),  -- Miles Davis    → Jazz
    (40, 2),  -- John Coltrane  → Jazz
    (41, 2),  -- Louis Armstrong → Jazz
    (42, 2),  -- Billie Holiday  → Jazz
    (43, 2),  -- Ella Fitzgerald → Jazz
    (44, 2),  -- Thelonious Monk → Jazz
    (45, 2),  -- Herbie Hancock  → Jazz

    (46, 10), -- B.B. King      → Blues
    (47, 10), -- Muddy Waters   → Blues
    (48, 10), -- Robert Johnson → Blues
    (50, 10), -- Eric Clapton   → Blues


    (51, 11), -- Johnny Cash    → Country
    (52, 11), -- Dolly Parton   → Country
    (53, 11), -- Willie Nelson  → Country

    (54, 13), -- James Brown    → Funk
    (55, 13), -- Sly and the Family Stone → Funk
    (56, 13), -- Parliament-Funkadelic    → Funk


    (57, 14), -- Bad Bunny      → Latin
    (58, 14), -- J Balvin       → Latin
    (59, 14), -- Shakira        → Latin
    (60, 14), -- Marc Anthony   → Latin


    (61, 4),  -- Beethoven      → Classical
    (62, 4),  -- Mozart         → Classical
    (63, 4);  -- Bach           → Classical