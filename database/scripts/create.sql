-- 1. Create `page` table
CREATE TABLE page (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    view INT DEFAULT 0,
    ref_cnt INT DEFAULT 0
);
CREATE INDEX idx_page_refcnt ON page(ref_cnt DESC);

CREATE TABLE pageChunkHash (
    page_id INT NOT NULL,
    chunk_index INT NOT NULL,
    chunk_hash CHAR(64) NOT NULL,
    FOREIGN KEY (page_id) REFERENCES page(id) ON DELETE CASCADE,
    PRIMARY KEY (page_id, chunk_index)
);

-- 2. Create `keyword` table with full-VARCHAR(255) index
CREATE TABLE keyword (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    FULLTEXT(name)
);

-- 3. Create `pageKeywordMap` table
CREATE TABLE pageKeywordMap (
    page_id INT NOT NULL,
    keyword_id INT NOT NULL,
    PRIMARY KEY (page_id, keyword_id),
    FOREIGN KEY (page_id) REFERENCES page(id) ON DELETE CASCADE,
    FOREIGN KEY (keyword_id) REFERENCES keyword(id) ON DELETE CASCADE
);

-- Index to retrieve all pages by keyword
CREATE INDEX idx_pageKeywordMap_keyword_id ON pageKeywordMap(keyword_id);

-- 4. Create `map` table
CREATE TABLE map (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL
);

-- 5. Create `childMap` table
CREATE TABLE childMap (
    parent_map_id INT NOT NULL,
    child_map_id INT DEFAULT NULL,
    child_page_id INT DEFAULT NULL,
    FOREIGN KEY (parent_map_id) REFERENCES map(id) ON DELETE CASCADE,
    FOREIGN KEY (child_map_id) REFERENCES map(id) ON DELETE CASCADE,
    FOREIGN KEY (child_page_id) REFERENCES page(id) ON DELETE CASCADE,
    CHECK (
        (child_map_id IS NOT NULL AND child_page_id IS NULL) OR
        (child_map_id IS NULL AND child_page_id IS NOT NULL)
    )
);

-- Index for fast parent → children traversal
CREATE INDEX idx_childMap_parent_map_id ON childMap(parent_map_id);

-- Stored function to increase reference count on insert
DELIMITER $$
CREATE TRIGGER trg_refcnt_increase
AFTER INSERT ON childMap
FOR EACH ROW
BEGIN
    IF NEW.child_page_id IS NOT NULL THEN
        UPDATE page
        SET ref_cnt = ref_cnt + 1
        WHERE id = NEW.child_page_id;
    END IF;
END;
$$

-- Stored function to decrease reference count on delete
CREATE TRIGGER trg_refcnt_decrease
AFTER DELETE ON childMap
FOR EACH ROW
BEGIN
    IF OLD.child_page_id IS NOT NULL THEN
        UPDATE page
        SET ref_cnt = ref_cnt - 1
        WHERE id = OLD.child_page_id;
    END IF;
END;
$$
DELIMITER ;
