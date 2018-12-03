function PMT(interestRate, numberPeriods, loanAmount) {
  var discountFactor = (Math.pow(1 + interestRate, numberPeriods) - 1) / (interestRate * Math.pow(1 + interestRate, numberPeriods));
  return loanAmount / discountFactor;
}

// TODO: This function should be split and unit tested as it's critical!!!!
// TODO: This should be an option for the user/function.
var numberOfYearsToProject = 15;
function computeFinancials(info) {
  /* This function computes all financial information for the property.
     This decouples this computation code from the UI that consumes the
     generated JSON.

     @Result
     JSON file:
     {
      "monthlyGrossIncome":
      "vacancies": [...], // One entry per year generated determined by |numberOfYearsToProject|.
      "loanAmount": [...] // Remaining principal.
     }
  */
  // TODO: Consider moving the projection to a per-year array instead of
  // an array of the different metrics of the property currently.
     
  var financials = {};
  financials.monthlyGrossIncome = [ grossScheduledMonthlyIncome(info.incomeStreams)];
  financials.vacancies = [info.expenses.vacancy * financials.monthlyGrossIncome[0]];
  financials.monthlyOperatingExpenses = [0];
  financials.loanAmount = [];
  // TODO: HACK to avoid repeating this for loop. FIX!!!!
  financials.expensesForChart = [['Expense', '$']];
  for (var expense in info.expenses) {
    // TODO: It's gross to ignore vacancy. It should be moved out of the operating expenses.
    if (expense === "vacancy")
      continue;

    // TODO: Gross.
    var expenseAmount = 0;
    if (expense == "maintenance") {
      expenseAmount += info.expenses[expense] * financials.monthlyGrossIncome[0];
    } else {
      expenseAmount = info.expenses[expense];
    }
    financials.monthlyOperatingExpenses[0] += expenseAmount;
    financials.expensesForChart.push([expense, expenseAmount]);
  }
  financials.expensesForChart.push(["vacancy", financials.vacancies[0]]);
  financials.equity = [ info.property.price - getLoanAmount(info.property.price, info.loans[0].amount) + info.closingCosts.amount + info.closingCosts.repairs ];
  financials.noi = [ 12 * (financials.monthlyGrossIncome[0] - financials.monthlyOperatingExpenses[0] - financials.vacancies[0]) ];
  // TODO: Rename to balance.
  financials.loanAmount.push(getLoanAmount(info.property.price, info.loans[0].amount));
  var paymentPerPeriod = PMT(info.loans[0].rate / 12, info.loans[0].months, financials.loanAmount[0]);
  console.log(paymentPerPeriod);
  financials.monthlyDebtService = paymentPerPeriod;
  financials.cashflow = [ financials.noi[0] - 12 * financials.monthlyDebtService ];
  financials.propertyValue = [ info.property.price ];

  var nextYearEquity = financials.equity[0];

  // Return on equity.
  financials.cashflowROE = [financials.cashflow[0] / financials.equity[0]];
  var equityAccrued = info.future.appreciation * financials.propertyValue[0];
  nextYearEquity += equityAccrued;
  financials.propertyValue.push(financials.propertyValue[0] + equityAccrued);
  financials.appreciationROE = [ equityAccrued / financials.equity[0]];
  financials.loanReductionROE = [];
  var amortization = amortizationForPeriod(info.property.price, info.loans, 0, 12);
  nextYearEquity += amortization.loanReduction;
  financials.loanAmount.push(financials.loanAmount[0] - amortization.loanReduction);
  financials.equity.push(nextYearEquity);
  financials.loanReductionROE = [];
  financials.loanReductionROE.push(amortization.loanReduction / financials.equity[0]);
  // Compute the depreciation. Per the IRS, it depends on the type of property.
  // TODO: Make those computation work for other countries.
  var depreciationOfAsset = info.tax.percentValueOfImprovement * info.property.price;
  if (info.property.type === "commercial") {
    depreciationOfAsset /= 39;
  } else {
    depreciationOfAsset /= 27.5;
  }
  var remainingTaxDeduction = (depreciationOfAsset + info.closingCosts.repairs + amortization.interestPaid) - financials.cashflow[0];
  financials.taxROE = [ (remainingTaxDeduction * info.tax.bracket) / financials.equity[0] ];

  financials.totalROE = [ financials.cashflowROE[0] + financials.appreciationROE[0] + financials.loanReductionROE[0] + financials.taxROE[0] ];

  for (var i = 1; i < numberOfYearsToProject; ++i) {
    financials.monthlyGrossIncome.push(financials.monthlyGrossIncome[i - 1] * (1 + info.future.rentIncrease));
    financials.vacancies.push(info.expenses.vacancy * financials.monthlyGrossIncome[i]);
    financials.monthlyOperatingExpenses.push(financials.monthlyOperatingExpenses[i - 1] * (1 + info.future.expenseIncrease));
    financials.noi.push(12 * (financials.monthlyGrossIncome[i] - financials.monthlyOperatingExpenses[i] - financials.vacancies[i]));
    financials.cashflow.push(financials.noi[i] - 12 * financials.monthlyDebtService);

    var nextYearEquity = financials.equity[i];

    // Return on equity.
    financials.cashflowROE.push(financials.cashflow[i] / financials.equity[i]);
    var equityAccrued = info.future.appreciation * financials.propertyValue[i];
    nextYearEquity += equityAccrued;
    financials.propertyValue.push(financials.propertyValue[i] + equityAccrued);
    financials.appreciationROE.push(equityAccrued / financials.equity[i]);

    nextYearEquity += equityAccrued;
    financials.appreciationROE.push(equityAccrued / financials.equity[i]);
    var amortization = amortizationForPeriod(info.property.price, info.loans, 12 * i, 12 * (i + 1));
    nextYearEquity += amortization.loanReduction;
    financials.loanAmount.push(financials.loanAmount[i] - amortization.loanReduction);
    financials.loanReductionROE.push(amortization.loanReduction / financials.equity[i]);
    financials.equity.push(nextYearEquity);
    financials.loanReductionROE.push(amortization.loanReduction / financials.equity[i]);
    var remainingTaxDeduction = (depreciationOfAsset + amortization.interestPaid) - financials.cashflow[i];
    financials.taxROE.push((remainingTaxDeduction * info.tax.bracket) / financials.equity[i]);

    financials.totalROE.push(financials.cashflowROE[i] + financials.appreciationROE[i] + financials.loanReductionROE[i] + financials.taxROE[i]);
  }

  return financials;
}

// Rewrite of the logic above with unit testing.
// TODO: Remove the code above.

function convertToAbsoluteExpense(propertyPrice, grossScheduledMonthlyIncome, expense) {
  if (expense.type === "absolute") {
    return expense.amount;
  } else if (expense.type === "percentagePropertyPrice") {
    return expense.amount * propertyPrice;
  } else if (expense.type === "percentageGSI") {
    return expense.amount * grossScheduledMonthlyIncome;
  }
  throw "Unknown expense type: " + expense.type;
}

function grossScheduledMonthlyIncome(incomeStreams) {
  var income = 0;
  for (var i = 0; i < incomeStreams.length; ++i) {
    income += incomeStreams[i].amount;
  }
  return income;
}

function noi(propertyPrice, incomeStreams, expenses) {
  // TODO: Support expenses that are a percentage of GOI (business tax).
  var expensePerMonth = 0;
  var expensePerYear = 0;
  for (var i = 0; i < expenses.length; ++i) {
    var expense = expenses[i];
    if (expense.schedule === "monthly") {
      expensePerMonth += convertToAbsoluteExpense(propertyPrice, grossScheduledMonthlyIncome, expense);
    } else if (expense.schedule === "yearly") {
      expensePerYear += convertToAbsoluteExpense(propertyPrice, 12 * grossScheduledMonthlyIncome, expense);
    } else {
      throw "Unknown schedule for expense: " + expense.schedule;
    }
  }
  return 12 * (grossScheduledMonthlyIncome(incomeStreams) - expensePerMonth) - expensePerYear;
}

function round(number) {
  return Math.round(number * 100) / 100;
}

function getLoanAmount(propertyPrice, amount) {
  if (amount.type === "absolute") {
    return amount.value;
  } else if (amount.type === "percentage") {
    return amount.value * propertyPrice;
  }
  throw "Invalid loan type: " + amount.type;
}

function amortizationForPeriod(propertyPrice, loans, startPeriod, endPeriod) {
  /* Start is excluded but end is included.
   *
   * Thus to compute the second year's worth of data you should
   * call: amortizationForPeriod(loans, 12, 24).
   */

  // TODO: Support multiple loans.
  // TODO: Support interest only loans and/or deferred interest.
  // TODO: Support a percentage of the property value.
  // TODO: Is the rounding correct? E.g. shouldn't each payment/interest be rounded?
  if (startPeriod > endPeriod) {
    throw "Invalid [start, end] periods: [" + startPeriod + ", " + endPeriod + "]";
  }

  // Ensure we don't go past the end of the loan.
  endPeriod = Math.min(endPeriod, loans[0].months);
  startPeriod = Math.min(startPeriod, endPeriod);
  if (startPeriod == endPeriod) {
    throw "Start/end periods are equal (did you provide them past the end of the loan?)";
  }

  var initialLoanAmount = getLoanAmount(propertyPrice, loans[0].amount);
  var balance = initialLoanAmount;
  var paymentPerPeriod = PMT(loans[0].rate / 12, loans[0].months, initialLoanAmount);
  // Move forward to the period to consider.
  for (var i = 0; i < startPeriod; ++i) {
    var interest = balance * loans[0].rate / 12;
    balance -= (paymentPerPeriod - interest);
  }

  // Now compute over the period.
  var totalInterestPaid = 0;
  var startingBalance = balance;
  for (var i = startPeriod; i < endPeriod; ++i) {
    var interest = balance * loans[0].rate / 12;
    balance -= (paymentPerPeriod - interest);
    totalInterestPaid += interest;
  }

  // TODO: Return the debt service too (12 * PMT)?
  return {"interestPaid": round(totalInterestPaid), "loanReduction": round(startingBalance - balance)};
}

function roundPercentage(percent) {
  return Math.round(percent * 10000) / 10000;
}

function generateRoi(absoluteRoi, cashOutlay) {
  return {"absolute": round(absoluteRoi),
          "percentage": roundPercentage(absoluteRoi/cashOutlay)};
}

function roi(propertyPrice, closingCosts, incomeStreams, expenses, loans) {
  // TODO: Allow arbitrary start/end period.
  var amortization = amortizationForPeriod(propertyPrice, loans, 0, 12);

  var debtService =  amortization.interestPaid + amortization.loanReduction;
  var cashflow = noi(propertyPrice, incomeStreams, expenses) - debtService;

  // TODO: Support multiple loans and multiple closing costs.
  var cashOutlay = propertyPrice - getLoanAmount(propertyPrice, loans[0].amount) + closingCosts[0].amount;

  var roi = {};
  roi.cashOnCash = generateRoi(cashflow, cashOutlay);
  roi.loanReduction = generateRoi(amortization.loanReduction, cashOutlay);
  roi.appreciation = generateRoi(0, cashOutlay); // TODO: Implement.
  roi.tax = generateRoi(0, cashOutlay); // TODO: Implement.
  roi.total = generateRoi(cashflow + amortization.loanReduction, cashOutlay);
  return roi;
}

try {
  // Register the modules for testing. In production,
  // |module| is not defined so we just disable the
  // no-such-variable exception.
  module.exports.noi = noi;
  module.exports.amortizationForPeriod = amortizationForPeriod;
  module.exports.roi = roi;
} catch (e) { }
