use aztec::macros::aztec;

pub mod types;
pub mod test;

#[aztec]
pub contract InvoiceRegistry {
    // imports
    use aztec::{
        macros::{
            functions::{external, initializer, internal},
            storage::storage
        },
        context::PrivateContext,
        protocol_types::{
            address::AztecAddress,
            traits::ToField
        },
        state_vars::{PrivateImmutable, PublicMutable, Map}
    };
    use token_contract::Token;
    use crate::types::invoice_note::{InvoiceNote, PaymentInfo};
    use poseidon::poseidon2::Poseidon2;

    #[storage]
    struct Storage<Context> {
        // PRIVATE: Only sender can read invoice details (encrypted on-chain)
        private_invoices: Map<Field, PrivateImmutable<InvoiceNote, Context>, Context>,
        
        // PUBLIC: Payment info stored as individual fields for simpler storage
        // Map from invoice_id to each field of payment info
        partial_notes: Map<Field, PublicMutable<Field, Context>, Context>,
        token_addresses: Map<Field, PublicMutable<AztecAddress, Context>, Context>,
        amounts: Map<Field, PublicMutable<u128, Context>, Context>,
        title_hashes: Map<Field, PublicMutable<Field, Context>, Context>,
    }
    
    /**
     * Create a new invoice
     * 
     * @param invoice_id - Unique identifier for the invoice
     * @param title_hash - Hash of the invoice title (public)
     * @param token_address - Token to be paid
     * @param amount - Amount to be paid
     * @param metadata - Optional private metadata
     */
    #[external("private")]
    fn create_invoice(
        invoice_id: Field,
        title_hash: Field,
        token_address: AztecAddress,
        amount: u128,
        metadata: Field
    ) {
        let sender = context.msg_sender().unwrap();

        // Create partial note (sender will receive payment privately)
        let partial_note = Token::at(token_address)
            .initialize_transfer_commitment(
                sender,
                context.this_address()
            ).call(&mut context);

        // Store PRIVATE invoice data (encrypted)
        let invoice_note = InvoiceNote::new(
            context.this_address(),  // owner is the registry contract
            sender,
            metadata,
            invoice_id
        );
        storage.private_invoices.at(invoice_id)
            .initialize(invoice_note);

        // Store PUBLIC payment info as separate fields for easier storage
        // Enqueue public function calls to store payment info
        InvoiceRegistry::at(context.this_address())
            ._store_payment_info(
                invoice_id,
                partial_note,
                token_address,
                amount,
                title_hash
            ).enqueue(&mut context);
    }

    /**
     * Internal function to store payment info in public storage
     * Called from create_invoice via enqueue
     */
    #[external("public")]
    fn _store_payment_info(
        invoice_id: Field,
        partial_note: Field,
        token_address: AztecAddress,
        amount: u128,
        title_hash: Field
    ) {
        storage.partial_notes.at(invoice_id).write(partial_note);
        storage.token_addresses.at(invoice_id).write(token_address);
        storage.amounts.at(invoice_id).write(amount);
        storage.title_hashes.at(invoice_id).write(title_hash);
    }
    
    /**
     * Pay an invoice by completing the partial note
     *
     * @param invoice_id - The invoice to pay
     * @param partial_note - The partial note commitment from the invoice
     * @param token_address - The token to pay with
     * @param amount - The amount to pay
     * @param _nonce - Authwit nonce for token transfer
     */
    #[external("private")]
    fn pay_invoice(
        invoice_id: Field,
        partial_note: Field,
        token_address: AztecAddress,
        amount: u128,
        _nonce: Field
    ) {
        let caller = context.msg_sender().unwrap();
        
        // Complete partial note (transfer tokens from payer to sender)
        Token::at(token_address)
            .transfer_private_to_commitment(
                caller,
                partial_note,
                amount,
                _nonce
            )
            .call(&mut context);
        
        // PREVENT DOUBLE-PAYMENT: Emit nullifier (using contract address as salt)
        let payment_nullifier = compute_payment_nullifier(invoice_id, context.this_address());
        context.push_nullifier(payment_nullifier);
        
        // TODO: Emit event for API tracking
        // Events in private functions are not yet fully supported, so we skip this for now
    }

    /**
     * Check if an invoice has been paid
     *
     * @param invoice_id - The invoice to check
     * @return true if paid, false otherwise
     */
    #[external("utility")]
    unconstrained fn is_paid(invoice_id: Field) -> pub bool {
        let nullifier = compute_payment_nullifier(invoice_id, context.this_address());
        // For now return false - proper nullifier checking requires oracle setup
        // TODO: Implement proper nullifier existence check
        false
    }

    /**
     * Get private invoice data (only sender with correct viewing keys can read)
     * 
     * @param invoice_id - The invoice to retrieve
     * @return The private invoice note
     */
    #[external("utility")]
    unconstrained fn get_invoice(invoice_id: Field) -> pub InvoiceNote {
        storage.private_invoices.at(invoice_id).view_note()
    }

    /**
     * Get public payment info (anyone can read)
     * 
     * @param invoice_id - The invoice to retrieve
     * @return The public payment information as a struct
     */
    #[external("utility")]
    unconstrained fn get_payment_info(invoice_id: Field) -> pub PaymentInfo {
        let partial_note = storage.partial_notes.at(invoice_id).read();
        let token_address = storage.token_addresses.at(invoice_id).read();
        let amount = storage.amounts.at(invoice_id).read();
        let title_hash = storage.title_hashes.at(invoice_id).read();
        
        PaymentInfo {
            partial_note,
            token_address,
            amount,
            title_hash
        }
    }

    /**
     * Helper function to compute payment nullifier consistently
     * Uses contract address as salt for automatic uniqueness per deployment
     * 
     * @param invoice_id - The invoice ID
     * @param contract_address - The registry contract address
     * @return The payment nullifier
     */
    #[contract_library_method]
    fn compute_payment_nullifier(invoice_id: Field, contract_address: AztecAddress) -> Field {
        Poseidon2::hash([invoice_id, contract_address.to_field()], 2)
    }
}
