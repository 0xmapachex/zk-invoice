use aztec::{
    protocol_types::address::AztecAddress,
    test::helpers::test_environment::TestEnvironment
};
use crate::InvoiceRegistry;
use token_contract::Token;

/**
 * Create an invoice on the InvoiceRegistry
 */
pub unconstrained fn create_invoice(
    env: &mut TestEnvironment,
    sender: AztecAddress,
    registry: AztecAddress,
    invoice_id: Field,
    title_hash: Field,
    token_address: AztecAddress,
    amount: u128,
    metadata: Field
) -> Field {
    // Call create_invoice on the registry
    env.call_private(
        sender,
        InvoiceRegistry::at(registry)
            .create_invoice(
                invoice_id,
                title_hash,
                token_address,
                amount,
                metadata
            )
    );
    
    // Return partial_note (would be returned from the function in real implementation)
    // For test purposes, we'll just return a placeholder
    invoice_id
}

/**
 * Pay an invoice
 */
pub unconstrained fn pay_invoice(
    env: &mut TestEnvironment,
    payer: AztecAddress,
    registry: AztecAddress,
    invoice_id: Field,
    partial_note: Field,
    token_address: AztecAddress,
    amount: u128,
    nonce: Field
) {
    env.call_private(
        payer,
        InvoiceRegistry::at(registry)
            .pay_invoice(invoice_id, partial_note, token_address, amount, nonce)
    );
}

/**
 * Check if an invoice is paid
 */
pub unconstrained fn is_invoice_paid(
    env: &mut TestEnvironment,
    registry: AztecAddress,
    invoice_id: Field
) -> bool {
    env.simulate_utility(
        InvoiceRegistry::at(registry)
            .is_paid(invoice_id)
    )
}

/**
 * Get private invoice details (only sender can read)
 */
pub unconstrained fn get_invoice(
    env: &mut TestEnvironment,
    caller: AztecAddress,
    registry: AztecAddress,
    invoice_id: Field
) -> InvoiceNote {
    env.simulate_utility(
        InvoiceRegistry::at(registry)
            .get_invoice(invoice_id)
    )
}

/**
 * Get public payment info (anyone can read)
 */
pub unconstrained fn get_payment_info(
    env: &mut TestEnvironment,
    registry: AztecAddress,
    invoice_id: Field
) -> PaymentInfo {
    env.simulate_utility(
        InvoiceRegistry::at(registry)
            .get_payment_info(invoice_id)
    )
}

// Import types from the main contract
use crate::types::invoice_note::{InvoiceNote, PaymentInfo};

