use token_contract::Token;
use crate::test::utils::{
    setup::{setup, INVOICE_AMOUNT},
    invoice,
    token
};

// Basic e2e invoice test
#[test]
unconstrained fn full_invoice_payment_success() {
    // get test environment
    let (env, accounts, contracts) = setup(true);
    
    let invoice_id = 1;
    let title_hash = 123456789; // Hash of invoice title
    let metadata = 999; // Private metadata
    
    // Create invoice as sender
    let partial_note = invoice::create_invoice(
        env,
        accounts.sender,
        contracts.registry,
        invoice_id,
        title_hash,
        contracts.eth,
        INVOICE_AMOUNT,
        metadata
    );
    
    // Verify invoice is not paid yet
    let is_paid_before = invoice::is_invoice_paid(env, contracts.registry, invoice_id);
    assert_eq(is_paid_before, false, "Invoice should not be paid yet");
    
    // Get payment info (publicly available)
    let payment_info = invoice::get_payment_info(env, contracts.registry, invoice_id);
    assert_eq(payment_info.token_address, contracts.eth, "Token address mismatch");
    assert_eq(payment_info.amount, INVOICE_AMOUNT, "Amount mismatch");
    assert_eq(payment_info.title_hash, title_hash, "Title hash mismatch");
    
    // Payer pays the invoice
    let nonce = 42; // Random nonce for payment
    invoice::pay_invoice(
        env,
        accounts.payer,
        contracts.registry,
        invoice_id,
        payment_info.partial_note,
        payment_info.token_address,
        payment_info.amount,
        nonce
    );
    
    // Verify invoice is now paid
    let is_paid_after = invoice::is_invoice_paid(env, contracts.registry, invoice_id);
    assert_eq(is_paid_after, true, "Invoice should be paid");
    
    // Check final balances
    token::expect_private_balance(env, contracts.eth, accounts.sender, INVOICE_AMOUNT);
    token::expect_private_balance(env, contracts.eth, accounts.payer, 0);
}

// Ensure cannot pay invoice twice (double payment prevention)
#[test(should_fail_with = "failed with duplicate nullifiers")]
unconstrained fn invoice_double_payment_fail() {
    // get test environment
    let (env, accounts, contracts) = setup(true);
    
    let invoice_id = 2;
    let title_hash = 123456789;
    let metadata = 999;
    
    // Create invoice
    invoice::create_invoice(
        env,
        accounts.sender,
        contracts.registry,
        invoice_id,
        title_hash,
        contracts.eth,
        INVOICE_AMOUNT,
        metadata
    );
    
    // Pay invoice once
    let payment_info = invoice::get_payment_info(env, contracts.registry, invoice_id);
    let nonce = 42;
    invoice::pay_invoice(
        env,
        accounts.payer,
        contracts.registry,
        invoice_id,
        payment_info.partial_note,
        payment_info.token_address,
        payment_info.amount,
        nonce
    );
    
    // Mint more tokens to payer so they have enough for second payment
    env.call_private(
        accounts.minter,
        Token::at(contracts.eth)
            .mint_to_private(accounts.payer, INVOICE_AMOUNT)
    );
    
    // Try to pay again (should fail due to nullifier)
    let nonce2 = 43;
    invoice::pay_invoice(
        env,
        accounts.payer,
        contracts.registry,
        invoice_id,
        payment_info.partial_note,
        payment_info.token_address,
        payment_info.amount,
        nonce2
    );
}

// Ensure cannot pay invoice without sufficient balance
#[test(should_fail_with = "Assertion failed: Balance too low")]
unconstrained fn invoice_pay_insufficient_balance_fail() {
    // get test environment (without minting tokens to payer)
    let (env, accounts, contracts) = setup(false);
    
    let invoice_id = 3;
    let title_hash = 123456789;
    let metadata = 999;
    
    // Create invoice as sender
    invoice::create_invoice(
        env,
        accounts.sender,
        contracts.registry,
        invoice_id,
        title_hash,
        contracts.eth,
        INVOICE_AMOUNT,
        metadata
    );
    
    // Try to pay without sufficient balance (should fail)
    let payment_info = invoice::get_payment_info(env, contracts.registry, invoice_id);
    let nonce = 42;
    invoice::pay_invoice(
        env,
        accounts.payer,
        contracts.registry,
        invoice_id,
        payment_info.partial_note,
        payment_info.token_address,
        payment_info.amount,
        nonce
    );
}

// Test sender privacy - only sender can read private invoice details
#[test]
unconstrained fn invoice_sender_privacy() {
    // get test environment
    let (env, accounts, contracts) = setup(true);
    
    let invoice_id = 4;
    let title_hash = 123456789;
    let metadata = 999; // This should be private
    
    // Create invoice as sender
    invoice::create_invoice(
        env,
        accounts.sender,
        contracts.registry,
        invoice_id,
        title_hash,
        contracts.eth,
        INVOICE_AMOUNT,
        metadata
    );
    
    // Sender can read private invoice details
    let invoice = invoice::get_invoice(env, accounts.sender, contracts.registry, invoice_id);
    assert_eq(invoice.sender, accounts.sender, "Sender address mismatch");
    assert_eq(invoice.metadata, metadata, "Metadata mismatch");
    assert_eq(invoice.invoice_id, invoice_id, "Invoice ID mismatch");
    
    // Payer can read public payment info (but not private details)
    let payment_info = invoice::get_payment_info(env, contracts.registry, invoice_id);
    assert_eq(payment_info.amount, INVOICE_AMOUNT, "Public amount mismatch");
    // Note: Payer CANNOT read private invoice.metadata or invoice.sender without encryption key
}

// Ensure multiple invoices can be created independently
#[test]
unconstrained fn multiple_invoices_independent() {
    // get test environment
    let (env, accounts, contracts) = setup(true);
    
    // Create first invoice
    invoice::create_invoice(
        env,
        accounts.sender,
        contracts.registry,
        1,
        111,
        contracts.eth,
        INVOICE_AMOUNT,
        999
    );
    
    // Create second invoice
    invoice::create_invoice(
        env,
        accounts.sender,
        contracts.registry,
        2,
        222,
        contracts.eth,
        INVOICE_AMOUNT,
        888
    );
    
    // Verify both exist and are independent
    let invoice1_paid = invoice::is_invoice_paid(env, contracts.registry, 1);
    let invoice2_paid = invoice::is_invoice_paid(env, contracts.registry, 2);
    assert_eq(invoice1_paid, false, "Invoice 1 should not be paid");
    assert_eq(invoice2_paid, false, "Invoice 2 should not be paid");
    
    // Pay only invoice 1
    let payment_info1 = invoice::get_payment_info(env, contracts.registry, 1);
    invoice::pay_invoice(env, accounts.payer, contracts.registry, 1, payment_info1.partial_note, payment_info1.token_address, payment_info1.amount, 42);
    
    // Verify only invoice 1 is paid
    let invoice1_paid_after = invoice::is_invoice_paid(env, contracts.registry, 1);
    let invoice2_paid_after = invoice::is_invoice_paid(env, contracts.registry, 2);
    assert_eq(invoice1_paid_after, true, "Invoice 1 should be paid");
    assert_eq(invoice2_paid_after, false, "Invoice 2 should still be unpaid");
}

