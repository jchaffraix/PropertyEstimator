import hashlib
import json
import logging
import os
import webapp2

from google.appengine.api import users
from google.appengine.ext import ndb

# TODO: Move to a new file.
class Report(ndb.Model):
  # We store the serialized string as-is, without any interpretation.
  # TODO: As we don't do any type of validation, this opens the door
  # to persistent CSRF. Find a way to prevent this.
  report = ndb.JsonProperty()

  # The last time this was saved. Used for ordering the data.
  last_updated_timestamp = ndb.DateProperty(auto_now=True)

  @classmethod
  def key_for_user(cls, user):
    if user is None:
      return ""

    return ndb.Key("User", user.user_id())
    
  # Get a report keyed by the user email.
  @classmethod
  def get_for_user(cls, user):
    return cls.query(ancestor=Report.key_for_user(user)).order(-cls.last_updated_timestamp)

  @classmethod
  def get_by_id(cls, report_id):
    try:
      key = ndb.Key(urlsafe = report_id)
      return key.get()
    except Exception as e:
      logging.error("Bad report_id: %s (message = %s)" % (report_id, e))
      return None

  @classmethod
  def store(cls, report, user = None, report_id = None):
    # If there is no report_id, we just save. It's either
    # a new report or we're duplicating an existing one.
    if report_id is None:
      report = Report(parent = cls.key_for_user(user), report = report)
      report.put()
      return report.key.urlsafe()

    stored_report = cls.get_by_id(report_id)
    # If we can't find the report ID, log this and do nothing.
    # The key could be garbage (user provided).
    if stored_report is None:
      logging.error("Couldn't find the report for report_id = %s" % report_id)
      return None

    # We have found a report, check the parent key.
    # If we don't have one, it's an anonymous entry,
    # no check required.
    parent_key = stored_report.key.parent()
    if parent_key is None:
      stored_report.report = report
      stored_report.put()
      return stored_report.key.urlsafe()

    # If we have an ancestor, the user should match.
    if parent_key != cls.key_for_user(user):
      logging.error("Tried to override report_id=%s for user %s but ancestor_key doesn't match" % (report_id, user.user_id(), ancestor_key))
      return None

    stored_report.report = report
    stored_report.put()
    return stored_report.key.urlsafe()

class DashboardPage(webapp2.RequestHandler):
  def get(self):
    html = open('dashboard.html').read()
    if users.get_current_user():
      html += "<script>window.logged = true;</script>"
    self.response.write(html)

def get_report_id(url):
  # The API is called with <host>/{manage_report|report}[/<id>]?
  maybe_id_start_index = url.rfind("/")
  if maybe_id_start_index is -1:
    return None
  maybe_id = url[maybe_id_start_index + 1:]
  if maybe_id == "" or maybe_id == "manage_report" or maybe_id == "report":
    return None
  return maybe_id

class ReportPage(webapp2.RequestHandler):
  def get(self):
    html = open('report.html').read()
    # Inject the information about whether the user
    # was logged in and owns the report.
    # We still do validation on the server side for saving
    # but this removes a round-trip to the server to get
    # this information.
    report_id = get_report_id(self.request.url)
    user = users.get_current_user()
    if user:
      html += "<script>window.logged = true;</script>"
      if report_id:
        report = Report.get_by_id(report_id)
        if report and report.key.parent() == Report.key_for_user(user):
          html += "<script>window.ownsReport = true;</script>"
    self.response.write(html)

class ManageReport(webapp2.RequestHandler):
  def get(self):
    # We don't do any user checks when getting
    # a report as they are always sharable.
    id = get_report_id(self.request.url)
    if id is None:
      self.response.status_int = 403
      self.response.write("Not allowed to access record.");
      return

    logging.info("Id give to GET manage_record: %s" % id)
    report = Report.get_by_id(id)
    if report is not None:
      self.response.write(report.report)
      return

    self.response.status_int = 404
    self.response.write("Couldn't find report.");

  def post(self):
    # If we are connected, pass the user down to Report.store.
    # This enables it to check against the owner of the report.
    user = users.get_current_user()

    # |id| may be None, which is correctly handled by store.
    id = get_report_id(self.request.url)
    logging.info("Id given to POST manage_record: %s " % id)

    # TODO: We don't know if the issue is due to a bad key
    # or an unauthorized key. For now, we pretend it's unauthorized.
    key = Report.store(report = self.request.body, user = user, report_id = id)
    if key is None:
      self.response.status_int = 403
      self.response.write("Not allowed to access record.");

    # TODO: Ensure that a user cannot overwrite someone else's report!
    # TODO: Generate a report id and return it.
    self.response.write(key)

app = webapp2.WSGIApplication([
    ('/', DashboardPage),
    ('/report.*', ReportPage),
    ('/manage_report.*', ManageReport),
# TODO: Should I switch to debug=False?
], debug=True)
