// src/utils/routeGenerator.js

const toSnakeCase = (str) => {
  if (!str) return '';
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
};

const pluralize = (word) => {
  if (!word) return '';
  if (word.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(word.slice(-2, -1).toLowerCase())) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
};

function getRequiredFields(entity, entityRelationships) {
  const required = [];
  
  // Add required regular fields
  entity.fields.forEach(field => {
    if (field.name && field.name.toLowerCase() === 'name') {
      required.push(toSnakeCase(field.name));
    }
  });
  
  // Add required foreign keys (many-to-one relationships)
  const rels = entityRelationships[entity.name] || [];
  rels.filter(r => r.type === 'many-to-one').forEach(rel => {
    required.push(`${toSnakeCase(rel.target)}_id`);
  });
  
  return required;
}

function generateEntityRoutes(entity, entityRelationships) {
  const entitySnake = toSnakeCase(entity.name);
  const entityPluralSnake = toSnakeCase(pluralize(entity.name));
  const schemaName = `${entitySnake}_schema`;
  const schemaPluralName = `${entityPluralSnake}_schema`;
  
  const requiredFields = getRequiredFields(entity, entityRelationships);
  const rels = entityRelationships[entity.name] || [];
  
  let code = `# ========== ${entity.name.toUpperCase()} ROUTES ==========\n`;
  
  // GET all
  code += `@api_bp.route('/${entityPluralSnake}', methods=['GET'])\n`;
  code += `def get_${entityPluralSnake}():\n`;
  code += `    """Get all ${pluralize(entity.name)}"""\n`;
  code += `    ${entityPluralSnake} = ${entity.name}.query.all()\n`;
  code += `    return jsonify(${schemaPluralName}.dump(${entityPluralSnake}))\n\n`;
  
  // GET by ID
  code += `@api_bp.route('/${entityPluralSnake}/<int:id>', methods=['GET'])\n`;
  code += `def get_${entitySnake}(id):\n`;
  code += `    """Get a single ${entity.name} by ID"""\n`;
  code += `    ${entitySnake} = ${entity.name}.query.get_or_404(id)\n`;
  code += `    return jsonify(${schemaName}.dump(${entitySnake}))\n\n`;
  
  // POST (create)
  code += `@api_bp.route('/${entityPluralSnake}', methods=['POST'])\n`;
  code += `def create_${entitySnake}():\n`;
  code += `    """Create a new ${entity.name}"""\n`;
  code += `    data = request.get_json()\n`;
  code += `    \n`;
  code += `    # Validate required fields\n`;
  if (requiredFields.length > 0) {
    code += `    required_fields = [${requiredFields.map(f => `'${f}'`).join(', ')}]\n`;
    code += `    for field in required_fields:\n`;
    code += `        if field not in data:\n`;
    code += `            return jsonify({'error': f'Missing required field: {field}'}), 400\n`;
    code += `    \n`;
  }
  code += `    ${entitySnake} = ${entity.name}(\n`;
  
  // Add field assignments
  const fieldAssignments = [];
  entity.fields.forEach(field => {
    if (field.name) {
      fieldAssignments.push(`        ${toSnakeCase(field.name)}=data.get('${toSnakeCase(field.name)}')`);
    }
  });
  
  // Add foreign key assignments
  rels.filter(r => r.type === 'many-to-one').forEach(rel => {
    fieldAssignments.push(`        ${toSnakeCase(rel.target)}_id=data['${toSnakeCase(rel.target)}_id']`);
  });
  
  code += fieldAssignments.join(',\n');
  code += `\n    )\n`;
  code += `    \n`;
  code += `    db.session.add(${entitySnake})\n`;
  code += `    db.session.commit()\n`;
  code += `    return jsonify(${schemaName}.dump(${entitySnake})), 201\n\n`;
  
  // PUT (update)
  code += `@api_bp.route('/${entityPluralSnake}/<int:id>', methods=['PUT'])\n`;
  code += `def update_${entitySnake}(id):\n`;
  code += `    """Update an existing ${entity.name}"""\n`;
  code += `    ${entitySnake} = ${entity.name}.query.get_or_404(id)\n`;
  code += `    data = request.get_json()\n`;
  code += `    \n`;
  
  // Update fields
  entity.fields.forEach(field => {
    if (field.name) {
      const fieldSnake = toSnakeCase(field.name);
      code += `    if '${fieldSnake}' in data:\n`;
      code += `        ${entitySnake}.${fieldSnake} = data['${fieldSnake}']\n`;
    }
  });
  
  // Update foreign keys
  rels.filter(r => r.type === 'many-to-one').forEach(rel => {
    const fkName = `${toSnakeCase(rel.target)}_id`;
    code += `    if '${fkName}' in data:\n`;
    code += `        ${entitySnake}.${fkName} = data['${fkName}']\n`;
  });
  
  code += `    \n`;
  code += `    db.session.commit()\n`;
  code += `    return jsonify(${schemaName}.dump(${entitySnake}))\n\n`;
  
  // PATCH (partial update) - for many-to-many relationships
  const manyToManyRels = rels.filter(r => r.type === 'many-to-many');
  if (manyToManyRels.length > 0) {
    code += `@api_bp.route('/${entityPluralSnake}/<int:id>/${manyToManyRels[0].relationshipName}', methods=['PATCH'])\n`;
    code += `def update_${entitySnake}_${manyToManyRels[0].relationshipName}(id):\n`;
    code += `    """Add or remove ${pluralize(manyToManyRels[0].target)} for a ${entity.name}"""\n`;
    code += `    ${entitySnake} = ${entity.name}.query.get_or_404(id)\n`;
    code += `    data = request.get_json()\n`;
    code += `    \n`;
    code += `    if 'add' in data:\n`;
    code += `        for ${toSnakeCase(manyToManyRels[0].target)}_id in data['add']:\n`;
    code += `            ${toSnakeCase(manyToManyRels[0].target)} = ${manyToManyRels[0].target}.query.get(${toSnakeCase(manyToManyRels[0].target)}_id)\n`;
    code += `            if ${toSnakeCase(manyToManyRels[0].target)} and ${toSnakeCase(manyToManyRels[0].target)} not in ${entitySnake}.${manyToManyRels[0].relationshipName}:\n`;
    code += `                ${entitySnake}.${manyToManyRels[0].relationshipName}.append(${toSnakeCase(manyToManyRels[0].target)})\n`;
    code += `    \n`;
    code += `    if 'remove' in data:\n`;
    code += `        for ${toSnakeCase(manyToManyRels[0].target)}_id in data['remove']:\n`;
    code += `            ${toSnakeCase(manyToManyRels[0].target)} = ${manyToManyRels[0].target}.query.get(${toSnakeCase(manyToManyRels[0].target)}_id)\n`;
    code += `            if ${toSnakeCase(manyToManyRels[0].target)} in ${entitySnake}.${manyToManyRels[0].relationshipName}:\n`;
    code += `                ${entitySnake}.${manyToManyRels[0].relationshipName}.remove(${toSnakeCase(manyToManyRels[0].target)})\n`;
    code += `    \n`;
    code += `    db.session.commit()\n`;
    code += `    return jsonify(${schemaName}.dump(${entitySnake}))\n\n`;
  }
  
  // DELETE
  code += `@api_bp.route('/${entityPluralSnake}/<int:id>', methods=['DELETE'])\n`;
  code += `def delete_${entitySnake}(id):\n`;
  code += `    """Delete a ${entity.name}"""\n`;
  code += `    ${entitySnake} = ${entity.name}.query.get_or_404(id)\n`;
  code += `    db.session.delete(${entitySnake})\n`;
  code += `    db.session.commit()\n`;
  code += `    return '', 204\n\n`;
  
  return code;
}

function processRelationships(entities, relationships) {
  const entityRelationships = {};
  entities.forEach(e => { if (e.name) entityRelationships[e.name] = []; });

  relationships.forEach(rel => {
    const { entity1, entity2, entity1HasMany, entity2HasMany } = rel;
    if (entity1HasMany === null || entity2HasMany === null) return;
    if (!entity1HasMany && !entity2HasMany) return;

    if (entity1HasMany && entity2HasMany) {
      entityRelationships[entity1].push({ 
        type: 'many-to-many', 
        target: entity2, 
        backPopulates: toSnakeCase(pluralize(entity1)),
        relationshipName: toSnakeCase(pluralize(entity2))
      });
      entityRelationships[entity2].push({ 
        type: 'many-to-many', 
        target: entity1, 
        backPopulates: toSnakeCase(pluralize(entity2)),
        relationshipName: toSnakeCase(pluralize(entity1))
      });
    } else if (entity1HasMany && !entity2HasMany) {
      entityRelationships[entity1].push({ 
        type: 'one-to-many', 
        target: entity2, 
        backPopulates: toSnakeCase(entity1),
        relationshipName: toSnakeCase(pluralize(entity2))
      });
      entityRelationships[entity2].push({ 
        type: 'many-to-one', 
        target: entity1, 
        backPopulates: toSnakeCase(pluralize(entity2)),
        relationshipName: toSnakeCase(entity1)
      });
    } else if (!entity1HasMany && entity2HasMany) {
      entityRelationships[entity2].push({ 
        type: 'one-to-many', 
        target: entity1, 
        backPopulates: toSnakeCase(entity2),
        relationshipName: toSnakeCase(pluralize(entity1))
      });
      entityRelationships[entity1].push({ 
        type: 'many-to-one', 
        target: entity2, 
        backPopulates: toSnakeCase(pluralize(entity1)),
        relationshipName: toSnakeCase(entity2)
      });
    }
  });
  return entityRelationships;
}

export function generateRoutes(entities, relationships, projectName) {
  const entityRelationships = processRelationships(entities, relationships);
  
  let code = `# Generated API Routes for ${projectName}\n\n`;
  code += `from flask import Blueprint, request, jsonify\n`;
  code += `from .extensions import db\n`;
  code += `from .models import ${entities.map(e => e.name).filter(Boolean).join(', ')}\n`;
  code += `from .schemas import (\n`;
  
  // Import all schemas
  const schemaImports = [];
  entities.forEach(entity => {
    if (entity.name) {
      const entitySnake = toSnakeCase(entity.name);
      const entityPluralSnake = toSnakeCase(pluralize(entity.name));
      schemaImports.push(`    ${entitySnake}_schema, ${entityPluralSnake}_schema`);
    }
  });
  code += schemaImports.join(',\n');
  code += `\n)\n\n`;
  
  code += `api_bp = Blueprint('api', __name__)\n\n`;
  
  // Generate routes for each entity
  entities.forEach(entity => {
    if (entity.name) {
      code += generateEntityRoutes(entity, entityRelationships);
    }
  });
  
  // Add health check
  code += `# ========== HEALTH CHECK ==========\n`;
  code += `@api_bp.route('/health', methods=['GET'])\n`;
  code += `def health_check():\n`;
  code += `    """API health check endpoint"""\n`;
  code += `    return jsonify({\n`;
  code += `        'status': 'healthy',\n`;
  code += `        'message': 'API is running',\n`;
  code += `        'project': '${projectName}'\n`;
  code += `    })\n`;
  
  return code;
}