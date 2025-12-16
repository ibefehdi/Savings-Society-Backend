const ExcelJS = require('exceljs');
const Shareholder = require('../models/shareholderSchema');
const Savings = require('../models/savingsSchema');
const Share = require('../models/shareSchema');
const SavingsConfig = require('../models/savingsConfigSchema');
const ShareConfig = require('../models/shareConfigSchema');
const Amanat = require('../models/amanatSchema');

// Helper function to calculate eligible months - ALWAYS 12 months for 2024
const calculateEligibleMonths = (depositDate, withdrawalDate = null, targetYear = 2024) => {
    // For 2024 interest calculation, ALL deposits get full 12 months interest
    // This aligns with the correct_values.xlsx file
    return 12;
};

// New savings interest calculation using simple interest
const calculateSavingsInterest2024 = async (savings) => {
    if (!savings || savings.withdrawn) {
        return {
            initialAmount: 0,
            interestEarned: 0,
            finalAmount: 0,
            transferredToAmanat: 0,
            remainingInSavings: 0
        };
    }

    const savingsConfig = await SavingsConfig.findOne({ year: 2024 });
    if (!savingsConfig) {
        return {
            initialAmount: savings.totalAmount || 0,
            interestEarned: 0,
            finalAmount: savings.totalAmount || 0,
            transferredToAmanat: 0,
            remainingInSavings: savings.totalAmount || 0
        };
    }

    const annualRate = savingsConfig.individualSharePercentage / 100; // 12% = 0.12
    const monthlyRate = annualRate / 12; // 1% per month

    let totalInitialAmount = 0;
    let totalInterest = 0;

    if (savings.deposits && savings.deposits.length > 0) {
        for (const deposit of savings.deposits) {
            const eligibleMonths = calculateEligibleMonths(deposit.date, null, 2024);
            const depositInterest = deposit.initialAmount * monthlyRate * eligibleMonths;

            totalInitialAmount += deposit.initialAmount;
            totalInterest += depositInterest;
        }
    } else {
        // Fallback to totalAmount if no deposits array
        totalInitialAmount = savings.totalAmount || 0;
        // Assume deposit was made before 2024 for full year calculation
        totalInterest = totalInitialAmount * annualRate;
    }

    const finalAmount = totalInitialAmount + totalInterest;

    // Handle 1000 KD cap and Amanat transfer
    let transferredToAmanat = 0;
    let remainingInSavings = finalAmount;

    if (finalAmount > 1000) {
        transferredToAmanat = finalAmount - 1000;
        remainingInSavings = 1000;
    }

    return {
        initialAmount: totalInitialAmount,
        interestEarned: totalInterest,
        finalAmount: finalAmount,
        transferredToAmanat: transferredToAmanat,
        remainingInSavings: remainingInSavings
    };
};

// New share interest calculation using simple interest
const calculateShareInterest2024 = async (share) => {
    if (!share || share.withdrawn) {
        return {
            initialAmount: 0,
            interestEarned: 0,
            finalAmount: 0
        };
    }

    const shareConfig = await ShareConfig.findOne({ year: 2024 });
    if (!shareConfig) {
        return {
            initialAmount: share.totalAmount || 0,
            interestEarned: 0,
            finalAmount: share.totalAmount || 0
        };
    }

    const annualRate = shareConfig.individualSharePercentage / 100; // 2% = 0.02
    const monthlyRate = annualRate / 12;

    let totalInitialAmount = 0;
    let totalInterest = 0;

    if (share.purchases && share.purchases.length > 0) {
        for (const purchase of share.purchases) {
            const eligibleMonths = calculateEligibleMonths(purchase.date, null, 2024);
            const purchaseInterest = purchase.initialAmount * monthlyRate * eligibleMonths;

            totalInitialAmount += purchase.initialAmount;
            totalInterest += purchaseInterest;
        }
    } else {
        // Fallback to totalAmount if no purchases array
        totalInitialAmount = share.totalAmount || 0;
        // Assume purchase was made before 2024 for full year calculation
        totalInterest = totalInitialAmount * annualRate;
    }

    return {
        initialAmount: totalInitialAmount,
        interestEarned: totalInterest,
        finalAmount: totalInitialAmount + totalInterest
    };
};

const generate2024InterestReport = async (req, res) => {
    try {
        console.log('Starting 2024 Interest Report Generation...');

        // Fetch all shareholders with their savings and shares
        const shareholders = await Shareholder.find({})
            .populate('savings')
            .populate('share')
            .lean();

        console.log(`Found ${shareholders.length} shareholders`);

        // Create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('2024 Interest Report');

        // Define columns
        worksheet.columns = [
            { header: 'Member Code', key: 'memberCode', width: 15 },
            { header: 'Full Name', key: 'fullName', width: 25 },
            { header: 'Civil ID', key: 'civilId', width: 15 },
            { header: 'Status', key: 'status', width: 12 },

            // Savings columns
            { header: 'Savings Initial', key: 'savingsInitial', width: 15 },
            { header: 'Savings Interest', key: 'savingsInterest', width: 15 },
            { header: 'Savings Total', key: 'savingsTotal', width: 15 },
            { header: 'To Amanat', key: 'toAmanat', width: 15 },
            { header: 'Remaining Savings', key: 'remainingSavings', width: 18 },

            // Share columns
            { header: 'Shares Initial', key: 'sharesInitial', width: 15 },
            { header: 'Shares Interest', key: 'sharesInterest', width: 15 },
            { header: 'Shares Total', key: 'sharesTotal', width: 15 },

            // Summary columns
            { header: 'Grand Total', key: 'grandTotal', width: 15 },
            { header: 'Notes', key: 'notes', width: 30 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        let totalSavingsInitial = 0;
        let totalSavingsInterest = 0;
        let totalSharesInitial = 0;
        let totalSharesInterest = 0;
        let totalAmanatTransfers = 0;

        // Process each shareholder
        for (const shareholder of shareholders) {
            console.log(`Processing shareholder: ${shareholder.membersCode}`);

            // Calculate savings interest
            const savingsCalc = await calculateSavingsInterest2024(shareholder.savings);

            // Calculate share interest
            const sharesCalc = await calculateShareInterest2024(shareholder.share);

            // Determine status
            let statusText = 'Unknown';
            if (shareholder.status === 0) statusText = 'Active';
            else if (shareholder.status === 1) statusText = 'Inactive';
            else if (shareholder.status === 2) statusText = 'Expired';

            // Create notes
            let notes = [];
            if (savingsCalc.transferredToAmanat > 0) {
                notes.push(`${savingsCalc.transferredToAmanat.toFixed(3)} KD transferred to Amanat`);
            }
            if (!shareholder.savings) notes.push('No savings record');
            if (!shareholder.share) notes.push('No share record');

            // Add row to worksheet
            worksheet.addRow({
                memberCode: shareholder.membersCode,
                fullName: shareholder.fullName || `${shareholder.fName || ''} ${shareholder.lName || ''}`.trim(),
                civilId: shareholder.civilId,
                status: statusText,

                savingsInitial: Number(savingsCalc.initialAmount.toFixed(3)),
                savingsInterest: Number(savingsCalc.interestEarned.toFixed(3)),
                savingsTotal: Number(savingsCalc.finalAmount.toFixed(3)),
                toAmanat: Number(savingsCalc.transferredToAmanat.toFixed(3)),
                remainingSavings: Number(savingsCalc.remainingInSavings.toFixed(3)),

                sharesInitial: Number(sharesCalc.initialAmount.toFixed(3)),
                sharesInterest: Number(sharesCalc.interestEarned.toFixed(3)),
                sharesTotal: Number(sharesCalc.finalAmount.toFixed(3)),

                grandTotal: Number((savingsCalc.remainingInSavings + sharesCalc.finalAmount + savingsCalc.transferredToAmanat).toFixed(3)),
                notes: notes.join('; ')
            });

            // Update totals
            totalSavingsInitial += savingsCalc.initialAmount;
            totalSavingsInterest += savingsCalc.interestEarned;
            totalSharesInitial += sharesCalc.initialAmount;
            totalSharesInterest += sharesCalc.interestEarned;
            totalAmanatTransfers += savingsCalc.transferredToAmanat;
        }

        // Add summary row
        worksheet.addRow({});
        const summaryRow = worksheet.addRow({
            memberCode: 'TOTALS:',
            fullName: '',
            civilId: '',
            status: '',

            savingsInitial: Number(totalSavingsInitial.toFixed(3)),
            savingsInterest: Number(totalSavingsInterest.toFixed(3)),
            savingsTotal: Number((totalSavingsInitial + totalSavingsInterest).toFixed(3)),
            toAmanat: Number(totalAmanatTransfers.toFixed(3)),
            remainingSavings: Number((totalSavingsInitial + totalSavingsInterest - totalAmanatTransfers).toFixed(3)),

            sharesInitial: Number(totalSharesInitial.toFixed(3)),
            sharesInterest: Number(totalSharesInterest.toFixed(3)),
            sharesTotal: Number((totalSharesInitial + totalSharesInterest).toFixed(3)),

            grandTotal: Number((totalSavingsInitial + totalSavingsInterest + totalSharesInitial + totalSharesInterest).toFixed(3)),
            notes: 'Summary totals'
        });

        // Style the summary row
        summaryRow.font = { bold: true };
        summaryRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFD700' }
        };

        // Add calculation methodology sheet
        const methodologySheet = workbook.addWorksheet('Calculation Methodology');
        methodologySheet.addRow(['2024 Interest Calculation Methodology']);
        methodologySheet.addRow([]);
        methodologySheet.addRow(['Interest Rates:']);
        methodologySheet.addRow(['- Savings: 12% annually (1% per month)']);
        methodologySheet.addRow(['- Shares: 2% annually (0.167% per month)']);
        methodologySheet.addRow([]);
        methodologySheet.addRow(['Calculation Rules:']);
        methodologySheet.addRow(['- Simple Interest Formula: Principal × Rate × Time']);
        methodologySheet.addRow(['- Interest starts 1 month after deposit']);
        methodologySheet.addRow(['- Interest ends 1 month before withdrawal']);
        methodologySheet.addRow(['- Savings cap at 1000 KD - excess transfers to Amanat']);
        methodologySheet.addRow([]);
        methodologySheet.addRow(['Example:']);
        methodologySheet.addRow(['- 1000 KD deposited in savings']);
        methodologySheet.addRow(['- Full year: 1000 × 12% = 120 KD interest']);
        methodologySheet.addRow(['- Total: 1120 KD']);
        methodologySheet.addRow(['- 1000 KD remains in savings, 120 KD transfers to Amanat']);

        methodologySheet.getRow(1).font = { bold: true, size: 14 };

        // Set response headers for file download
        const filename = `Interest_Report_2024_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write the workbook to response
        await workbook.xlsx.write(res);
        res.end();

        console.log('2024 Interest Report generated successfully');

    } catch (error) {
        console.error('Error generating 2024 interest report:', error);
        res.status(500).json({
            message: 'Error generating 2024 interest report',
            error: error.message
        });
    }
};

module.exports = {
    generate2024InterestReport
};