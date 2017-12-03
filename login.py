import webapp2

from google.appengine.api import users

class LogoutPage(webapp2.RequestHandler):
  def get(self):
    self.redirect(users.CreateLogoutURL("/"))

class EmptyPage(webapp2.RequestHandler):
  def get(self):
    self.response.write("<!DOCTYPE html>")

app = webapp2.WSGIApplication([
    # We use an empty as we rely on login: required to
    # handle the actual authentication.
    # The caller is expected to close this from
    # the JavaScript side to avoid unnecessary tabs.
    ('/login', EmptyPage),
    ('/logout', LogoutPage),
], debug=True)
