DELIMITER $$

CREATE PROCEDURE createNote (
    IN in_title VARCHAR(255),
    IN in_parentMapId INT,
    IN in_keywords TEXT,
    OUT out_noteid INT
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE kw VARCHAR(255);

    -- Cursor to iterate over comma-separated keywords
    DECLARE cur CURSOR FOR
        SELECT TRIM(value)
        FROM json_table(
            CONCAT('["', REPLACE(in_keywords, ',', '","'), '"]'),
            "$[*]" COLUMNS (value VARCHAR(255) PATH "$")
        ) AS jt;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Step 1: Insert note title into `page`
    INSERT INTO page (title) VALUES (in_title);
    SET out_noteid = LAST_INSERT_ID();

    -- Step 1.2: Insert title as keyword 
    INSERT IGNORE INTO keyword (name) VALUES (in_title);
    INSERT IGNORE INTO pageKeywordMap (page_id, keyword_id)
    SELECT out_noteid, id FROM keyword WHERE name = in_title;

    -- Step 2: Process keywords
    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO kw;
        IF done THEN
            LEAVE read_loop;
        END IF;

        -- Step 2.1: Insert keyword if not already present
        INSERT IGNORE INTO keyword (name) VALUES (kw);

        -- Step 2.2: Map keyword to the newly created page
        INSERT IGNORE INTO pageKeywordMap (page_id, keyword_id)
        SELECT out_noteid, id FROM keyword WHERE name = kw;
    END LOOP;
    CLOSE cur;

    -- Step 3: Link the page to its parent map in childMap
    INSERT INTO childMap (parent_map_id, child_map_id, child_page_id)
    VALUES (in_parentMapId, NULL, out_noteid);

END $$

CREATE PROCEDURE getMapChildren(IN in_map_id INT)
BEGIN
    SELECT p.*
    FROM childMap cm
    JOIN page p ON cm.child_page_id = p.id
    WHERE cm.parent_map_id = in_map_id
        AND cm.child_page_id IS NOT NULL
    LIMIT 100;

    SELECT m.*
    FROM childMap cm
    JOIN map m ON cm.child_map_id = m.id
    WHERE cm.parent_map_id = in_map_id
        AND cm.child_map_id IS NOT NULL;
END $$
    
CREATE PROCEDURE addKeyword(
    IN in_page_id INT,
    IN in_keywords TEXT
)
BEGIN
    DECLARE kw TEXT;
    DECLARE comma_pos INT;

    -- Loop through the comma-separated list
    WHILE LENGTH(in_keywords) > 0 DO
        SET comma_pos = LOCATE(',', in_keywords);

        IF comma_pos > 0 THEN
            SET kw = TRIM(SUBSTRING(in_keywords, 1, comma_pos - 1));
            SET in_keywords = SUBSTRING(in_keywords, comma_pos + 1);
        ELSE
            SET kw = TRIM(in_keywords);
            SET in_keywords = '';
        END IF;

        -- Insert keyword if it doesn't exist
        INSERT IGNORE INTO keyword (name) VALUES (kw);

        -- Map keyword to the page
        INSERT IGNORE INTO pageKeywordMap (page_id, keyword_id)
        SELECT in_page_id, id FROM keyword WHERE name = kw;

    END WHILE;
END $$

DELIMITER ;
