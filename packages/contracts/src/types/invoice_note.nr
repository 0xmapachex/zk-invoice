use aztec::{
    macros::notes::note,
    oracle::random::random,
    protocol_types::{
        traits::{Deserialize, Serialize, Packable},
        address::AztecAddress,
    },  
};

// Private invoice data (encrypted on-chain, only sender can read with viewing keys)
#[derive(Eq, Serialize, Deserialize, Packable)]
#[note]
pub struct InvoiceNote {
    pub owner: AztecAddress,        // Note owner (registry contract)
    pub sender: AztecAddress,       // Who receives payment (kept private)
    pub metadata: Field,             // Optional private notes
    pub invoice_id: Field,           // Links to public payment info
    pub randomness: Field,
}

impl InvoiceNote {
    pub fn new(
        owner: AztecAddress,
        sender: AztecAddress,
        metadata: Field,
        invoice_id: Field,
    ) -> Self {
        Self {
            owner,
            sender,
            metadata,
            invoice_id,
            randomness: unsafe { random() }
        }
    }
}

// Public payment info (visible to all, needed for payer to complete payment)
#[derive(Eq, Serialize, Deserialize, Packable)]
pub struct PaymentInfo {
    pub partial_note: Field,        // Incomplete note commitment for payment
    pub token_address: AztecAddress,
    pub amount: u128,
    pub title_hash: Field,          // Hash of invoice title
}

