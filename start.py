import os
import logging
import webapp2

class StartPage(webapp2.RequestHandler):
  def get(self):
      template = open('start.html').read()
      self.response.write(template)

app = webapp2.WSGIApplication([
    ('/', StartPage),
# TODO: Should I switch to debug=False?
], debug=True)
