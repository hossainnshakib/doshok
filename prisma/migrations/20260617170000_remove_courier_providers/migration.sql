-- Drop courier provider integration tables. Delivery zones and order delivery
-- address fields remain active for COD checkout.
DROP TABLE IF EXISTS "OrderShipment";
DROP TABLE IF EXISTS "CourierProviderSetting";
