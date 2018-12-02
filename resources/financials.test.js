const financials = require("./financials");

function buildSimpleIncomeStream(name, amount) {
  return {"name": name, "amount": amount };
}

function buildSimpleExpense(name, amount) {
  return {"name": name, "amount": amount };
}

// NOI testing.

test("basic noi", () => {
  expect(financials.noi([buildSimpleIncomeStream("rent", 1000)],
                        [buildSimpleExpense("repair", 500)]))
    .toBe(6000);
});

test("noi multiple income streams and expenses", () => {
  expect(financials.noi([buildSimpleIncomeStream("rent", 1000),
                         buildSimpleIncomeStream("washing", 10)], 
                        [buildSimpleExpense("tax", 100),
                         buildSimpleExpense("repair", 400)]))
      .toBe(6120);
});
