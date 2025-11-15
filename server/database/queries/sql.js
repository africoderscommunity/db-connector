export const MssqlPrimaryAndUniqueIndexes = `
SELECT 
    t.name AS TableName,
    i.name AS IndexName,
    c.name AS ColumnName,
    CASE 
        WHEN i.is_primary_key = 1 THEN 'PRIMARY'
        WHEN i.is_unique = 1 THEN 'UNIQUE'
        ELSE 'INDEX'
    END AS KeyType,
    fk.name AS ForeignKeyName,
    ref_t.name AS ReferencedTable,
    ref_c.name AS ReferencedColumn
FROM sys.tables AS t
INNER JOIN sys.indexes AS i
    ON t.object_id = i.object_id
INNER JOIN sys.index_columns AS ic
    ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns AS c
    ON ic.object_id = c.object_id AND ic.column_id = c.column_id
LEFT JOIN sys.foreign_key_columns AS fkc
    ON fkc.parent_object_id = t.object_id AND fkc.parent_column_id = c.column_id
LEFT JOIN sys.foreign_keys AS fk
    ON fk.object_id = fkc.constraint_object_id
LEFT JOIN sys.tables AS ref_t
    ON ref_t.object_id = fkc.referenced_object_id
LEFT JOIN sys.columns AS ref_c
    ON ref_c.object_id = fkc.referenced_object_id AND ref_c.column_id = fkc.referenced_column_id
WHERE i.type_desc <> 'HEAP'
ORDER BY t.name, i.name, ic.key_ordinal;
`
