import os
import logging
import webapp2

class DashboardPage(webapp2.RequestHandler):
  def get(self):
      template = open('dashboard.html').read()
      self.response.write(template)

class NewPage(webapp2.RequestHandler):
  def get(self):
    template = open('new.html').read()
    self.response.write(template)

app = webapp2.WSGIApplication([
    ('/', DashboardPage),
    ('/new', NewPage),
# TODO: Should I switch to debug=False?
], debug=True)
