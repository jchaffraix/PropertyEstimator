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
  financials.monthlyGrossIncome = [ info.incomeStreams.rent + info.incomeStreams.other ];
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
  financials.equity = [ info.mortgage.downpayment * info.property.price + info.closingCosts.amount + info.closingCosts.repairs ];
  financials.noi = [ 12 * (financials.monthlyGrossIncome[0] - financials.monthlyOperatingExpenses[0] - financials.vacancies[0]) ];
  // TODO: Rename to principalRemaining.
  financials.loanAmount.push((1 - info.mortgage.downpayment) * info.property.price);
  financials.monthlyDebtService = PMT(info.mortgage.interest / 12, info.mortgage.lengthYears * 12, financials.loanAmount);
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
  var interests = 0;
  var loanReduction = 0;
  for (var k = 0; k < 12; ++k) {
    var interest = (financials.loanAmount[0] - loanReduction) * (info.mortgage.interest / 12);
    loanReduction += financials.monthlyDebtService - interest;
    interests += interest;
  }
  nextYearEquity += loanReduction;
  financials.loanAmount.push(financials.loanAmount[0] - loanReduction);
  financials.equity.push(nextYearEquity);
  financials.loanReductionROE = [];
  financials.loanReductionROE.push(loanReduction / financials.equity[0]);
  // Compute the depreciation. Per the IRS, it depends on the type of property.
  // TODO: Make those computation work for other countries.
  var depreciationOfAsset = info.tax.percentValueOfImprovement * info.property.price;
  if (info.property.type === "commercial") {
    depreciationOfAsset /= 39;
  } else {
    depreciationOfAsset /= 27.5;
  }
  var remainingTaxDeduction = (depreciationOfAsset + info.closingCosts.repairs + interest) - financials.cashflow[0];
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
    var interests = 0;
    var loanReduction = 0;
    for (var k = 0; k < 12; ++k) {
      var interest = (financials.loanAmount[i] - loanReduction) * (info.mortgage.interest / 12);
      loanReduction += financials.monthlyDebtService - interest;
      interests += interest;
    }
    nextYearEquity += loanReduction;
    financials.loanAmount.push(financials.loanAmount[i] - loanReduction);
    financials.loanReductionROE.push(loanReduction / financials.equity[i]);
    financials.equity.push(nextYearEquity);
    financials.loanReductionROE.push(loanReduction / financials.equity[i]);
    var remainingTaxDeduction = (depreciationOfAsset + interest) - financials.cashflow[i];
    financials.taxROE.push((remainingTaxDeduction * info.tax.bracket) / financials.equity[i]);

    financials.totalROE.push(financials.cashflowROE[i] + financials.appreciationROE[i] + financials.loanReductionROE[i] + financials.taxROE[i]);
  }

  return financials;
}

