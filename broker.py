import os
import logging
import webapp2

class DashboardPage(webapp2.RequestHandler):
  def get(self):
      template = open('dashboard.html').read()
      self.response.write(template)

class ReportPage(webapp2.RequestHandler):
  def get(self):
    template = open('report.html').read()
    self.response.write(template)

app = webapp2.WSGIApplication([
    ('/', DashboardPage),
    ('/report', ReportPage),
# TODO: Should I switch to debug=False?
], debug=True)
