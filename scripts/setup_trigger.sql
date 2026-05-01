CREATE OR REPLACE FUNCTION notify_new_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.keterangan = 'pengeluaran' THEN
        INSERT INTO notifications (category, title, message, type, is_unread, action_label)
        VALUES ('Finance', 'New expense recorded', 'Outgoing expense of ' || NEW.amount || ' via ' || NEW.method || ' has been logged.', 'transaction', true, 'View Details');
    ELSE
        INSERT INTO notifications (category, title, message, type, is_unread, action_label)
        VALUES ('Finance', 'New transaction detected', 'Incoming payment of ' || NEW.amount || ' via ' || NEW.method || ' has been logged.', 'transaction', true, 'View Details');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_new_transaction ON transactions;
CREATE TRIGGER trg_new_transaction
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION notify_new_transaction();

-- ============================================
-- TRIGGER FOR INVENTORY CONDITION
-- ============================================
CREATE OR REPLACE FUNCTION notify_asset_condition_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.condition <> 'Good') THEN
        INSERT INTO notifications (category, title, message, type, is_unread, action_label)
        VALUES (
            'Inventory', 
            'Hardware ' || NEW.sn || ' reported ' || NEW.condition, 
            'Asset type ' || NEW.type || ' at ' || NEW.location || ' requires attention. Condition: ' || NEW.condition, 
            'hardware', 
            true, 
            'Schedule Dispatch'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asset_condition ON asset_roster;
CREATE TRIGGER trg_asset_condition
AFTER UPDATE OF condition ON asset_roster
FOR EACH ROW
EXECUTE FUNCTION notify_asset_condition_change();
