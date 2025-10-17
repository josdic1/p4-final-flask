from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from .extensions import db, migrate, ma
from .routes import api
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView

def create_app():
    app = Flask(__name__)
    app.config.from_object('config.Config')

    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)
    ma.init_app(app)
    app.register_blueprint(api)

    admin = Admin(app, name='Admin', template_mode='bootstrap4')

    app.register_blueprint(api, url_prefix='/api')


    return app