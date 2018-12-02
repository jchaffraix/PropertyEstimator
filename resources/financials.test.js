const financials = require("./financials");

function buildSimpleIncomeStream(name, amount) {
  return {"name": name, "amount": amount };
}

function buildMonthlyExpense(name, amount) {
  return {"name": name, "amount": amount, "schedule": "monthly" };
}

function buildYearlyExpense(name, amount) {
  return {"name": name, "amount": amount, "schedule": "yearly" };
}

// NOI testing.

test("basic noi", () => {
  expect(financials.noi([buildSimpleIncomeStream("rent", 1000)],
                        [buildMonthlyExpense("repair", 500)]))
    .toBe(6000);
});

test("noi multiple income streams and expenses", () => {
  expect(financials.noi([buildSimpleIncomeStream("rent", 1000),
                         buildSimpleIncomeStream("washing", 10)], 
                        [buildMonthlyExpense("tax", 100),
                         buildMonthlyExpense("repair", 400)]))
      .toBe(6120);
});

test("noi multiple income streams and monthly/yeary expenses", () => {
  expect(financials.noi([buildSimpleIncomeStream("rent", 1000),
                         buildSimpleIncomeStream("washing", 10)], 
                        [buildYearlyExpense("tax", 500),
                         buildMonthlyExpense("repair", 400)]))
      .toBe(6820);
});

// amortizationForYear

function buildLoan(amount, rate, months) {
  return {"amount": amount, "rate": rate, "months": months };
}

test("simple full amortization", () => {
  var loans = [buildLoan(10000, 0.10, 12)];
  expect(financials.amortizationForPeriod(loans, 0, 12))
    .toEqual({"interestPaid": 549.91,
              "loanReduction": 10000});
});

test("simple not full amortization", () => {
  var loans = [buildLoan(100000, 0.07, 360)];
  expect(financials.amortizationForPeriod(loans, 0, 12))
    .toEqual({"interestPaid": 6967.82,
              "loanReduction": 1015.81});
});

test("simple amortization, year = 2", () => {
  var loans = [buildLoan(100000, 0.07, 360)];
  expect(financials.amortizationForPeriod(loans, 12, 24))
    .toEqual({"interestPaid": 6894.39,
              "loanReduction": 1089.24});
});

test("simple amortization, end period past loan end", () => {
  var loans = [buildLoan(100000, 0.07, 360)];
  expect(financials.amortizationForPeriod(loans, 0, 600))
    .toEqual({"interestPaid": 139508.9,
              "loanReduction": 100000});
});
