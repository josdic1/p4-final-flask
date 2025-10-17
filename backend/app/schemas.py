from .extensions import ma
from .models import User, Recipe, Category

class UserSchema(ma.SQLAlchemyAutoSchema):
    recipes = ma.Nested('RecipeSchema', many=True, exclude=('user',))

    class Meta:
        model = User
        load_instance = True
        include_fk = True

class RecipeSchema(ma.SQLAlchemyAutoSchema):
    user = ma.Nested('UserSchema', many=False, exclude=('recipes',))
    category = ma.Nested('CategorySchema', many=False, exclude=('recipes',))

    class Meta:
        model = Recipe
        load_instance = True
        include_fk = True

class CategorySchema(ma.SQLAlchemyAutoSchema):
    recipes = ma.Nested('RecipeSchema', many=True, exclude=('category',))

    class Meta:
        model = Category
        load_instance = True
        include_fk = True

# Schema instances
user_schema = UserSchema()
users_schema = UserSchema(many=True)
recipe_schema = RecipeSchema()
recipes_schema = RecipeSchema(many=True)
category_schema = CategorySchema()
categories_schema = CategorySchema(many=True)
