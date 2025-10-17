from flask import Flask
from flask_cors import CORS
from .extensions import db, migrate, ma
from .routes import api
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
import os

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # Configuration
    if config_name == 'production':
        app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
        app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
        app.config['DEBUG'] = False
    elif config_name == 'testing':
        app.config['SECRET_KEY'] = 'test-secret-key'
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['TESTING'] = True
    else:  # development
        app.config['SECRET_KEY'] = 'dev-secret-key'
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
        app.config['DEBUG'] = True
    
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)
    ma.init_app(app)
    
    # Initialize Flask-Admin
    admin = Admin(app, name='Recipe Manager Admin', template_mode='bootstrap4')
    
    # Import models and add to admin
    from .models import User, Recipe, Category
    admin.add_view(ModelView(User, db.session))
    admin.add_view(ModelView(Recipe, db.session))
    admin.add_view(ModelView(Category, db.session))
    
    # Register blueprints
    app.register_blueprint(api, url_prefix='/api')

    return app