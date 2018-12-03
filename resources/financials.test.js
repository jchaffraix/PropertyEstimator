const financials = require("./financials");

function buildSimpleIncomeStream(name, amount) {
  return {"name": name, "amount": amount };
}

function buildMonthlyExpense(name, amount) {
  return {"name": name, "amount": amount, "schedule": "monthly", "type": "absolute" };
}

function buildYearlyExpense(name, amount) {
  return {"name": name, "amount": amount, "schedule": "yearly", "type": "absolute" };
}

function buildTaxExpense(amount) {
  return {"name": "tax", "amount": amount, "schedule": "yearly", "type": "percentagePropertyPrice" };
}

function buildVacancyExpense(amount) {
  return {"name": "tax", "amount": amount, "schedule": "yearly", "type": "percentageGSI" };
}

// NOI testing.

test("basic noi", () => {
  expect(financials.noi(10000,
                        [buildSimpleIncomeStream("rent", 1000)],
                        [buildMonthlyExpense("repair", 500)]))
    .toBe(6000);
});

test("noi multiple income streams and expenses", () => {
  expect(financials.noi(10000,
                        [buildSimpleIncomeStream("rent", 1000),
                         buildSimpleIncomeStream("washing", 10)],
                        [buildMonthlyExpense("tax", 100),
                         buildMonthlyExpense("repair", 400)]))
      .toBe(6120);
});

test("noi multiple income streams and monthly/yeary expenses", () => {
  expect(financials.noi(10000,
                        [buildSimpleIncomeStream("rent", 1000),
                         buildSimpleIncomeStream("washing", 10)],
                        [buildYearlyExpense("tax", 500),
                         buildMonthlyExpense("repair", 400)]))
      .toBe(6820);
});

test("noi with GSI and property price percentage", () => {
  expect(financials.noi(10000,
                        [buildSimpleIncomeStream("rent", 1000)],
                        [buildTaxExpense(.013),
                         buildMonthlyExpense("repair", 400),
                         buildVacancyExpense(0.05)]))
      .toBe(6470);
});

// amortizationForYear

function buildLoan(amount, rate, months) {
  return {"amount": {"value": amount, "type": "absolute"}, "rate": rate, "months": months };
}

function buildLoanPercentage(percent, rate, months) {
  return {"amount": {"value": percent, "type": "percentage"},  "rate": rate, "months": months };
}

test("simple full amortization", () => {
  var loans = [buildLoan(10000, 0.10, 12)];
  expect(financials.amortizationForPeriod(80000, loans, 0, 12))
    .toEqual({"interestPaid": 549.91,
              "loanReduction": 10000});
});

test("simple not full amortization", () => {
  var loans = [buildLoan(100000, 0.07, 360)];
  expect(financials.amortizationForPeriod(80000, loans, 0, 12))
    .toEqual({"interestPaid": 6967.82,
              "loanReduction": 1015.81});
});

test("simple amortization, year = 2", () => {
  var loans = [buildLoan(100000, 0.07, 360)];
  expect(financials.amortizationForPeriod(80000, loans, 12, 24))
    .toEqual({"interestPaid": 6894.39,
              "loanReduction": 1089.24});
});

test("simple amortization, end period past loan end", () => {
  var loans = [buildLoan(100000, 0.07, 360)];
  expect(financials.amortizationForPeriod(80000, loans, 0, 600))
    .toEqual({"interestPaid": 139508.9,
              "loanReduction": 100000});
});

test("simple amortization, percentage amount", () => {
  var loans = [buildLoanPercentage(0.35, 0.05, 60)];
  expect(financials.amortizationForPeriod(80000, loans, 0, 12))
    .toEqual({"interestPaid": 1285.19,
              "loanReduction": 5055.55});
});

// ROI computations.

test("Realistic ROI (absolute numbers)", () => {
  var loans = [buildLoan(35200, 0.035, 180)];
  var incomeStream = [buildSimpleIncomeStream("rent", 486)];
  var expenses = [buildYearlyExpense("taxes", 572),
                  buildMonthlyExpense("condo fees", 300.4),
                  buildMonthlyExpense("vacancy", 14.58),
                  buildYearlyExpense("business license", 39)];
  var closingCosts = [{"amount": 2870}];
  expect(financials.roi(44000, closingCosts, incomeStream, expenses, loans))
    .toEqual({"cashOnCash": {"absolute": -1578.42, "percentage": -0.1353},
              "loanReduction": {"absolute": 1816.62, "percentage": 0.1557},
              "appreciation": {"absolute": 0, "percentage": 0},
              "tax": {"absolute": 0, "percentage": 0},
              "total": {"absolute": 238.2, "percentage": 0.0204}});
});

test("Realistic ROI (relative numbers)", () => {
  var loans = [buildLoan(35200, 0.035, 180)];
  var incomeStream = [buildSimpleIncomeStream("rent", 486)];
  var expenses = [buildTaxExpense(0.013),
                  buildMonthlyExpense("condo fees", 300.4),
                  buildVacancyExpense(.03),
                  buildYearlyExpense("business license", 39)];
  var closingCosts = [{"amount": 2870}];
  expect(financials.roi(44000, closingCosts, incomeStream, expenses, loans))
    .toEqual({"cashOnCash": {"absolute": -1578.42, "percentage": -0.1353},
              "loanReduction": {"absolute": 1816.62, "percentage": 0.1557},
              "appreciation": {"absolute": 0, "percentage": 0},
              "tax": {"absolute": 0, "percentage": 0},
              "total": {"absolute": 238.2, "percentage": 0.0204}});
});
