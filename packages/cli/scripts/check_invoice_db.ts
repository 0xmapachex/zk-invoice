#!/usr/bin/env bun
/**
 * Quick script to check invoice database contents
 */
import Database from "bun:sqlite";

const db = new Database("../api/invoices.sqlite");

console.log("\n📋 Current Invoices in Database:\n");
console.log("=" .repeat(80));

const invoices = db.query("SELECT invoiceId, partialNoteHash, status, amount FROM invoices").all() as any[];

if (invoices.length === 0) {
    console.log("No invoices found in database.\n");
} else {
    invoices.forEach((inv, idx) => {
        console.log(`\n${idx + 1}. Invoice ID: ${inv.invoiceId}`);
        console.log(`   Partial Note: ${inv.partialNoteHash}`);
        console.log(`   Status: ${inv.status}`);
        console.log(`   Amount: ${inv.amount}`);
        
        if (inv.partialNoteHash === "0x0" || inv.partialNoteHash === "0") {
            console.log(`   ⚠️  WARNING: Invalid partial note hash!`);
        } else {
            console.log(`   ✅ Valid partial note hash`);
        }
    });
    console.log("\n" + "=".repeat(80) + "\n");
}

db.close();

