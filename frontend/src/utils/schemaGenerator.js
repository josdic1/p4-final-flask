// src/utils/schemaGenerator.js

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

function processRelationships(entities, relationships) {
  const entityRelationships = {};
  entities.forEach(e => { if (e.name) entityRelationships[e.name] = []; });

  relationships.forEach(rel => {
    const { entity1, entity2, entity1HasMany, entity2HasMany } = rel;
    if (entity1HasMany === null || entity2HasMany === null) return;
    if (!entity1HasMany && !entity2HasMany) return;

    if (entity1HasMany && entity2HasMany) {
      // Many-to-Many: both sides get plural references
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
      // entity1 has many entity2s, entity2 belongs to one entity1
      // entity1 side: plural relationship name, back_populates to singular
      entityRelationships[entity1].push({ 
        type: 'one-to-many', 
        target: entity2, 
        backPopulates: toSnakeCase(entity1),
        relationshipName: toSnakeCase(pluralize(entity2))
      });
      // entity2 side: singular relationship name, back_populates to plural
      entityRelationships[entity2].push({ 
        type: 'many-to-one', 
        target: entity1, 
        backPopulates: toSnakeCase(pluralize(entity2)),
        relationshipName: toSnakeCase(entity1)
      });
    } else if (!entity1HasMany && entity2HasMany) {
      // entity2 has many entity1s, entity1 belongs to one entity2
      // entity2 side: plural relationship name, back_populates to singular
      entityRelationships[entity2].push({ 
        type: 'one-to-many', 
        target: entity1, 
        backPopulates: toSnakeCase(entity2),
        relationshipName: toSnakeCase(pluralize(entity1))
      });
      // entity1 side: singular relationship name, back_populates to plural
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

function getBridgeTableName(entity1, entity2) {
  // Always sort alphabetically to ensure consistent naming
  const sorted = [entity1, entity2].sort();
  return `${toSnakeCase(sorted[0])}_${toSnakeCase(pluralize(sorted[1]))}`;
}

function generateModelsCode(entities, entityRelationships, projectName) {
  let code = `# Generated Models for ${projectName}\n\n`;
  code += `from .extensions import db  # Relative import fix\n`;
  code += `from datetime import datetime, timezone\n\n`;
  
  // Generate bridge tables for many-to-many relationships
  const bridgeTables = new Set();
  
  Object.entries(entityRelationships).forEach(([entityName, rels]) => {
    rels.filter(r => r.type === 'many-to-many').forEach(rel => {
      const bridgeName = getBridgeTableName(entityName, rel.target);
      
      if (!bridgeTables.has(bridgeName)) {
        bridgeTables.add(bridgeName);
        const sorted = [entityName, rel.target].sort();
        
        code += `${bridgeName} = db.Table('${bridgeName}',\n`;
        code += `    db.Column('${toSnakeCase(sorted[0])}_id', db.Integer, db.ForeignKey('${toSnakeCase(pluralize(sorted[0]))}.id'), primary_key=True),\n`;
        code += `    db.Column('${toSnakeCase(sorted[1])}_id', db.Integer, db.ForeignKey('${toSnakeCase(pluralize(sorted[1]))}.id'), primary_key=True)\n`;
        code += `)\n\n`;
      }
    });
  });

  // Generate model classes
  entities.forEach(entity => {
    if (!entity.name) return;
    const rels = entityRelationships[entity.name] || [];
    
    code += `class ${entity.name}(db.Model):\n`;
    code += `    __tablename__ = '${toSnakeCase(pluralize(entity.name))}'\n\n`;
    code += `    id = db.Column(db.Integer, primary_key=True)\n`;
    
    // Add regular fields
    entity.fields.forEach(field => {
      if (field.name) {
        let dbType;
        switch (field.type) {
          case 'String': dbType = 'db.String(255)'; break;
          case 'Integer': dbType = 'db.Integer'; break;
          case 'Boolean': dbType = 'db.Boolean'; break;
          case 'DateTime': dbType = 'db.DateTime'; break;
          default: dbType = 'db.String(255)';
        }
        let columnArgs = '';
        if (field.name.toLowerCase() === 'name') {
          columnArgs = `nullable=False, unique=True`;
        } else {
          columnArgs = `nullable=True`;
        }
        code += `    ${toSnakeCase(field.name)} = db.Column(${dbType}${columnArgs ? `, ${columnArgs}` : ''})\n`;
      }
    });

    // Add foreign key columns for many-to-one relationships
    rels.filter(r => r.type === 'many-to-one').forEach(rel => {
      code += `    ${toSnakeCase(rel.target)}_id = db.Column(db.Integer, db.ForeignKey('${toSnakeCase(pluralize(rel.target))}.id'), nullable=False)\n`;
    });
    
    code += `    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))\n`;
    code += `    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))\n\n`;

    // Add relationships
    if (rels.length > 0) {
      code += `    # --- Relationships ---\n`;
      rels.forEach(rel => {
        code += `    ${rel.relationshipName} = db.relationship('${rel.target}', back_populates='${rel.backPopulates}'`;
        
        if (rel.type === 'one-to-many') {
          code += `, cascade='all, delete-orphan'`;
        }
        
        if (rel.type === 'many-to-many') {
          const bridgeName = getBridgeTableName(entity.name, rel.target);
          code += `, secondary=${bridgeName}`;
        }
        
        code += `)\n`;
      });
    }
    
    const hasNameField = entity.fields.some(f => f.name.toLowerCase() === 'name');
    const reprField = hasNameField ? 'name' : 'id';
    code += `\n    def __repr__(self):\n`;
    code += `        return f'<${entity.name} {self.${reprField}}>'\n`;
    code += `\n\n`;
  });
  
  return code;
}

function generateSchemasCode(entities, entityRelationships, projectName) {
  let code = `# Generated Schemas for ${projectName}\n\n`;
  code += `from .extensions import ma\n`;
  code += `from .models import ${entities.map(e => e.name).filter(Boolean).join(', ')}\n\n`;

  entities.forEach(entity => {
    if (!entity.name) return;
    const rels = entityRelationships[entity.name] || [];
    
    code += `class ${entity.name}Schema(ma.SQLAlchemyAutoSchema):\n`;
    
    if (rels.length > 0) {
      rels.forEach(rel => {
        const isMany = rel.type !== 'many-to-one';
        // Exclude the back reference to prevent circular serialization
        code += `    ${rel.relationshipName} = ma.Nested('${rel.target}Schema', many=${isMany}, exclude=('${rel.backPopulates}',))\n`;
      });
      code += `\n`;
    }

    code += `    class Meta:\n`;
    code += `        model = ${entity.name}\n`;
    code += `        load_instance = True\n`;
    code += `        include_fk = True\n`;
    code += `\n`;
  });

  code += `# Schema instances\n`;
  entities.forEach(entity => {
    if (entity.name) {
      code += `${toSnakeCase(entity.name)}_schema = ${entity.name}Schema()\n`;
      code += `${toSnakeCase(pluralize(entity.name))}_schema = ${entity.name}Schema(many=True)\n`;
    }
  });
  
  return code;
}

export function generateFullSchema(entities, relationships, projectName) {
  const entityRelationships = processRelationships(entities, relationships);
  const models = generateModelsCode(entities, entityRelationships, projectName);
  const schemas = generateSchemasCode(entities, entityRelationships, projectName);
  return { models, schemas };
}