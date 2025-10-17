# Generated Routes for Recipes

from flask import Blueprint, request, jsonify
from .extensions import db
from .models import User, Recipe, Category
from .schemas import (
    user_schema, users_schema,
    recipe_schema, recipes_schema,
    category_schema, categories_schema
)

api = Blueprint('api', __name__)

# USER ROUTES
@api.route('/users', methods=['GET'])
def get_users():
    items = User.query.all()
    return jsonify(users_schema.dump(items))

@api.route('/users/<int:id>', methods=['GET'])
def get_user(id):
    item = User.query.get_or_404(id)
    return jsonify(user_schema.dump(item))

@api.route('/users', methods=['POST'])
def create_user():
    data = request.get_json()
    required = ['name']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing: {field}'}), 400
    item = User(**data)
    db.session.add(item)
    db.session.commit()
    return jsonify(user_schema.dump(item)), 201

@api.route('/users/<int:id>', methods=['PUT'])
def update_user(id):
    item = User.query.get_or_404(id)
    data = request.get_json()
    for key, value in data.items():
        setattr(item, key, value)
    db.session.commit()
    return jsonify(user_schema.dump(item))

@api.route('/users/<int:id>', methods=['DELETE'])
def delete_user(id):
    item = User.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return '', 204

# RECIPE ROUTES
@api.route('/recipes', methods=['GET'])
def get_recipes():
    items = Recipe.query.all()
    return jsonify(recipes_schema.dump(items))

@api.route('/recipes/<int:id>', methods=['GET'])
def get_recipe(id):
    item = Recipe.query.get_or_404(id)
    return jsonify(recipe_schema.dump(item))

@api.route('/recipes', methods=['POST'])
def create_recipe():
    data = request.get_json()
    required = ['name', 'user_id', 'category_id']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing: {field}'}), 400
    item = Recipe(**data)
    db.session.add(item)
    db.session.commit()
    return jsonify(recipe_schema.dump(item)), 201

@api.route('/recipes/<int:id>', methods=['PUT'])
def update_recipe(id):
    item = Recipe.query.get_or_404(id)
    data = request.get_json()
    for key, value in data.items():
        setattr(item, key, value)
    db.session.commit()
    return jsonify(recipe_schema.dump(item))

@api.route('/recipes/<int:id>', methods=['DELETE'])
def delete_recipe(id):
    item = Recipe.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return '', 204

# CATEGORY ROUTES
@api.route('/categories', methods=['GET'])
def get_categories():
    items = Category.query.all()
    return jsonify(categories_schema.dump(items))

@api.route('/categories/<int:id>', methods=['GET'])
def get_category(id):
    item = Category.query.get_or_404(id)
    return jsonify(category_schema.dump(item))

@api.route('/categories', methods=['POST'])
def create_category():
    data = request.get_json()
    required = ['name']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing: {field}'}), 400
    item = Category(**data)
    db.session.add(item)
    db.session.commit()
    return jsonify(category_schema.dump(item)), 201

@api.route('/categories/<int:id>', methods=['PUT'])
def update_category(id):
    item = Category.query.get_or_404(id)
    data = request.get_json()
    for key, value in data.items():
        setattr(item, key, value)
    db.session.commit()
    return jsonify(category_schema.dump(item))

@api.route('/categories/<int:id>', methods=['DELETE'])
def delete_category(id):
    item = Category.query.get_or_404(id)
    db.session.delete(item)
    db.session.commit()
    return '', 204

@api.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'project': 'Recipes'})
