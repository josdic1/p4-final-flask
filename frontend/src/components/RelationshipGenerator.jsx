import React, { useReducer } from 'react';
import { Plus, Trash2, ArrowRight, Code, Database, Route } from 'lucide-react';

// Utility functions
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

function getBridgeTableName(entity1, entity2) {
  const sorted = [entity1, entity2].sort();
  return `${toSnakeCase(sorted[0])}_${toSnakeCase(pluralize(sorted[1]))}`;
}

function processRelationships(entities, relationships) {
  const entityRelationships = {};
  entities.forEach(e => { if (e.name) entityRelationships[e.name] = []; });

  relationships.forEach(rel => {
    const { entity1, entity2, entity1HasMany, entity2HasMany, skipRelationship } = rel;
    
    // Skip if explicitly marked to skip or if null values
    if (skipRelationship || entity1HasMany === null || entity2HasMany === null) return;
    
    // Skip if both are false (no relationship)
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

function generateModelsCode(entities, entityRelationships, projectName) {
  let code = `# Generated Models for ${projectName}\n\n`;
  code += `from .extensions import db\n`;
  code += `from datetime import datetime, timezone\n\n`;
  
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

  entities.forEach(entity => {
    if (!entity.name) return;
    const rels = entityRelationships[entity.name] || [];
    
    code += `class ${entity.name}(db.Model):\n`;
    code += `    __tablename__ = '${toSnakeCase(pluralize(entity.name))}'\n\n`;
    code += `    id = db.Column(db.Integer, primary_key=True)\n`;
    
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
        let columnArgs = field.name.toLowerCase() === 'name' ? 'nullable=False, unique=True' : 'nullable=True';
        code += `    ${toSnakeCase(field.name)} = db.Column(${dbType}, ${columnArgs})\n`;
      }
    });

    rels.filter(r => r.type === 'many-to-one').forEach(rel => {
      code += `    ${toSnakeCase(rel.target)}_id = db.Column(db.Integer, db.ForeignKey('${toSnakeCase(pluralize(rel.target))}.id'), nullable=False)\n`;
    });
    
    code += `    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))\n`;
    code += `    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))\n\n`;

    if (rels.length > 0) {
      code += `    # Relationships\n`;
      rels.forEach(rel => {
        code += `    ${rel.relationshipName} = db.relationship('${rel.target}', back_populates='${rel.backPopulates}'`;
        if (rel.type === 'one-to-many') code += `, cascade='all, delete-orphan'`;
        if (rel.type === 'many-to-many') {
          const bridgeName = getBridgeTableName(entity.name, rel.target);
          code += `, secondary=${bridgeName}`;
        }
        code += `)\n`;
      });
    }
    
    const hasNameField = entity.fields.some(f => f.name.toLowerCase() === 'name');
    code += `\n    def __repr__(self):\n`;
    code += `        return f'<${entity.name} {self.${hasNameField ? 'name' : 'id'}}>'\n\n\n`;
  });
  
  return code;
}

function generateSchemasCode(entities, entityRelationships) {
  let code = `from .extensions import ma\n`;
  code += `from .models import ${entities.map(e => e.name).filter(Boolean).join(', ')}\n\n`;

  entities.forEach(entity => {
    if (!entity.name) return;
    const rels = entityRelationships[entity.name] || [];
    
    code += `class ${entity.name}Schema(ma.SQLAlchemyAutoSchema):\n`;
    
    if (rels.length > 0) {
      rels.forEach(rel => {
        const isMany = rel.type !== 'many-to-one';
        code += `    ${rel.relationshipName} = ma.Nested('${rel.target}Schema', many=${isMany ? 'True' : 'False'}, exclude=('${rel.backPopulates}',))\n`;
      });
      code += `\n`;
    }

    code += `    class Meta:\n`;
    code += `        model = ${entity.name}\n`;
    code += `        load_instance = True\n`;
    code += `        include_fk = True\n\n`;
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

function generateRoutesCode(entities, entityRelationships, projectName) {
  let code = `# Generated Routes for ${projectName}\n\n`;
  code += `from flask import Blueprint, request, jsonify\n`;
  code += `from .extensions import db\n`;
  code += `from .models import ${entities.map(e => e.name).filter(Boolean).join(', ')}\n`;
  code += `from .schemas import (\n`;
  
  const imports = [];
  entities.forEach(e => {
    if (e.name) {
      const s = toSnakeCase(e.name);
      const p = toSnakeCase(pluralize(e.name));
      imports.push(`    ${s}_schema, ${p}_schema`);
    }
  });
  code += imports.join(',\n') + '\n)\n\n';
  code += `api_bp = Blueprint('api', __name__)\n\n`;
  
  entities.forEach(entity => {
    if (!entity.name) return;
    
    const entitySnake = toSnakeCase(entity.name);
    const entityPluralSnake = toSnakeCase(pluralize(entity.name));
    const schemaName = `${entitySnake}_schema`;
    const schemaPluralName = `${entityPluralSnake}_schema`;
    
    const rels = entityRelationships[entity.name] || [];
    const requiredFields = [];
    
    entity.fields.forEach(field => {
      if (field.name && field.name.toLowerCase() === 'name') {
        requiredFields.push(toSnakeCase(field.name));
      }
    });
    
    rels.filter(r => r.type === 'many-to-one').forEach(rel => {
      requiredFields.push(`${toSnakeCase(rel.target)}_id`);
    });
    
    code += `# ${entity.name.toUpperCase()} ROUTES\n`;
    code += `@api_bp.route('/${entityPluralSnake}', methods=['GET'])\n`;
    code += `def get_${entityPluralSnake}():\n`;
    code += `    items = ${entity.name}.query.all()\n`;
    code += `    return jsonify(${schemaPluralName}.dump(items))\n\n`;
    
    code += `@api_bp.route('/${entityPluralSnake}/<int:id>', methods=['GET'])\n`;
    code += `def get_${entitySnake}(id):\n`;
    code += `    item = ${entity.name}.query.get_or_404(id)\n`;
    code += `    return jsonify(${schemaName}.dump(item))\n\n`;
    
    code += `@api_bp.route('/${entityPluralSnake}', methods=['POST'])\n`;
    code += `def create_${entitySnake}():\n`;
    code += `    data = request.get_json()\n`;
    if (requiredFields.length > 0) {
      code += `    required = [${requiredFields.map(f => `'${f}'`).join(', ')}]\n`;
      code += `    for field in required:\n`;
      code += `        if field not in data:\n`;
      code += `            return jsonify({'error': f'Missing: {field}'}), 400\n`;
    }
    code += `    item = ${entity.name}(**data)\n`;
    code += `    db.session.add(item)\n`;
    code += `    db.session.commit()\n`;
    code += `    return jsonify(${schemaName}.dump(item)), 201\n\n`;
    
    code += `@api_bp.route('/${entityPluralSnake}/<int:id>', methods=['PUT'])\n`;
    code += `def update_${entitySnake}(id):\n`;
    code += `    item = ${entity.name}.query.get_or_404(id)\n`;
    code += `    data = request.get_json()\n`;
    code += `    for key, value in data.items():\n`;
    code += `        setattr(item, key, value)\n`;
    code += `    db.session.commit()\n`;
    code += `    return jsonify(${schemaName}.dump(item))\n\n`;
    
    code += `@api_bp.route('/${entityPluralSnake}/<int:id>', methods=['DELETE'])\n`;
    code += `def delete_${entitySnake}(id):\n`;
    code += `    item = ${entity.name}.query.get_or_404(id)\n`;
    code += `    db.session.delete(item)\n`;
    code += `    db.session.commit()\n`;
    code += `    return '', 204\n\n`;
  });
  
  code += `@api_bp.route('/health', methods=['GET'])\n`;
  code += `def health_check():\n`;
  code += `    return jsonify({'status': 'healthy', 'project': '${projectName}'})\n`;
  
  return code;
}

const initialState = {
  step: 1,
  projectName: '',
  entities: [{ name: '', fields: [] }],
  currentEntityIndex: 0,
  relationships: [],
  generatedCode: { models: '', schemas: '', routes: '' },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.payload };
    case 'ADD_ENTITY':
      return { ...state, entities: [...state.entities, { name: '', fields: [] }] };
    case 'REMOVE_ENTITY':
      if (state.entities.length <= 1) return state;
      return { ...state, entities: state.entities.filter((_, i) => i !== action.payload) };
    case 'UPDATE_ENTITY_NAME':
      const cleanName = action.payload.name
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z]/g, '')
        .replace(/^\w/, c => c.toUpperCase());
      return { ...state, entities: state.entities.map((e, i) => 
        i === action.payload.index ? { ...e, name: cleanName } : e
      ) };
    case 'SET_CURRENT_ENTITY_INDEX':
      return { ...state, currentEntityIndex: action.payload };
    case 'ADD_FIELD': {
      const newEntities = [...state.entities];
      newEntities[action.payload].fields.push({ name: '', type: 'String' });
      return { ...state, entities: newEntities };
    }
    case 'REMOVE_FIELD': {
      const newEntities = [...state.entities];
      newEntities[action.payload.entityIndex].fields = newEntities[action.payload.entityIndex].fields.filter((_, i) => i !== action.payload.fieldIndex);
      return { ...state, entities: newEntities };
    }
    case 'UPDATE_FIELD': {
      const newEntities = [...state.entities];
      newEntities[action.payload.entityIndex].fields[action.payload.fieldIndex][action.payload.key] = action.payload.value;
      return { ...state, entities: newEntities };
    }
    case 'SET_RELATIONSHIPS':
      return { ...state, relationships: action.payload };
    case 'UPDATE_RELATIONSHIP':
      return { 
      ...state, 
      relationships: state.relationships.map((r, i) => 
        i === action.payload.index 
          ? action.payload.key === 'multiple'
            ? { ...r, ...action.payload.value }
            : { ...r, [action.payload.key]: action.payload.value }
          : r
      ) 
    };
    case 'SET_GENERATED_CODE':
      return { ...state, generatedCode: action.payload };
    case 'RESET':
      return initialState;
    default:
      throw new Error();
  }
}

function getRelationshipOptions(entity1, entity2) {
  return [
    {
      value: 'none',
      label: `No direct relationship (they may connect through other tables)`,
      config: { entity1HasMany: false, entity2HasMany: false, skipRelationship: true }
    },
    {
      value: 'entity1-to-entity2',
      label: `${entity1} belongs to ONE ${entity2} (adds ${toSnakeCase(entity2)}_id to ${entity1})`,
      config: { entity1HasMany: false, entity2HasMany: true }
    },
    {
      value: 'entity2-to-entity1',
      label: `${entity2} belongs to ONE ${entity1} (adds ${toSnakeCase(entity1)}_id to ${entity2})`,
      config: { entity1HasMany: true, entity2HasMany: false }
    },
    {
      value: 'many-to-many',
      label: `Many-to-Many: ${pluralize(entity1)} ↔ ${pluralize(entity2)} (creates bridge table)`,
      config: { entity1HasMany: true, entity2HasMany: true }
    }
  ];
}

function FullSchemaGenerator() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { step, projectName, entities, currentEntityIndex, relationships, generatedCode } = state;

  const askRelationships = () => {
    const rels = [];
    const validEntities = entities.filter(e => e.name);
    for (let i = 0; i < validEntities.length; i++) {
      for (let j = i + 1; j < validEntities.length; j++) {
        rels.push({
          entity1: validEntities[i].name,
          entity2: validEntities[j].name,
          entity1HasMany: null,
          entity2HasMany: null
        });
      }
    }
    dispatch({ type: 'SET_RELATIONSHIPS', payload: rels });
    dispatch({ type: 'SET_STEP', payload: 3 });
  };

  const handleGenerateCode = () => {
    const entityRelationships = processRelationships(entities, relationships);
    const models = generateModelsCode(entities, entityRelationships, projectName);
    const schemas = generateSchemasCode(entities, entityRelationships);
    const routes = generateRoutesCode(entities, entityRelationships, projectName);
    
    dispatch({ type: 'SET_GENERATED_CODE', payload: { models, schemas, routes }});
    dispatch({ type: 'SET_STEP', payload: 4 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3 mb-2">
              <Database className="w-10 h-10 text-indigo-600" />
              Complete Backend Generator
            </h1>
            <p className="text-gray-600">Generate Models, Schemas, and API Routes</p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              {[1,2,3,4].map(num => (
                <React.Fragment key={num}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= num ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{num}</div>
                  {num < 4 && <ArrowRight className="w-5 h-5 text-gray-400" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 1: Define Your Tables</h2>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Project Name</label>
                <input type="text" value={projectName} onChange={(e) => dispatch({ type: 'SET_PROJECT_NAME', payload: e.target.value })} placeholder="e.g., Music Tracker" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none" />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Tables</label>
                {entities.map((entity, index) => (
                  <div key={index} className="flex gap-2 mb-3">
                    <input type="text" value={entity.name} onChange={(e) => dispatch({ type: 'UPDATE_ENTITY_NAME', payload: { index, name: e.target.value } })} placeholder="Entity name" className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg" />
                    {entities.length > 1 && (<button onClick={() => dispatch({ type: 'REMOVE_ENTITY', payload: index })} className="px-4 text-red-500"><Trash2 className="w-5 h-5" /></button>)}
                  </div>
                ))}
                <button onClick={() => dispatch({ type: 'ADD_ENTITY' })} className="flex items-center gap-2 text-indigo-600 font-semibold"><Plus className="w-5 h-5" /> Add Table</button>
              </div>
              <button onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })} disabled={!projectName || entities.filter(e => e.name).length < 2} className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold hover:bg-indigo-700 disabled:bg-gray-300">Next →</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 2: Add Fields</h2>
              <div className="flex gap-2 mb-6 flex-wrap">
                {entities.filter(e => e.name).map((entity, index) => (
                  <button key={index} onClick={() => dispatch({ type: 'SET_CURRENT_ENTITY_INDEX', payload: index })} className={`px-4 py-2 rounded-lg font-semibold ${currentEntityIndex === index ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>{entity.name}</button>
                ))}
              </div>
              {entities[currentEntityIndex] && (
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="text-xl font-bold mb-4">{entities[currentEntityIndex].name} Fields</h3>
                  {entities[currentEntityIndex].fields.map((field, fieldIndex) => (
                    <div key={fieldIndex} className="flex gap-2 mb-3">
                      <input type="text" value={field.name} onChange={(e) => dispatch({ type: 'UPDATE_FIELD', payload: { entityIndex: currentEntityIndex, fieldIndex, key: 'name', value: e.target.value } })} placeholder="name" className="flex-1 px-3 py-2 border rounded" />
                      <select value={field.type} onChange={(e) => dispatch({ type: 'UPDATE_FIELD', payload: { entityIndex: currentEntityIndex, fieldIndex, key: 'type', value: e.target.value } })} className="px-3 py-2 border rounded">
                        <option>String</option>
                        <option>Integer</option>
                        <option>Boolean</option>
                        <option>DateTime</option>
                      </select>
                      <button onClick={() => dispatch({ type: 'REMOVE_FIELD', payload: { entityIndex: currentEntityIndex, fieldIndex } })} className="px-3 text-red-500"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  ))}
                  <button onClick={() => dispatch({ type: 'ADD_FIELD', payload: currentEntityIndex })} className="flex items-center gap-2 text-indigo-600 font-semibold"><Plus className="w-5 h-5" /> Add Field</button>
                </div>
              )}
              <div className="flex gap-4">
                <button onClick={() => dispatch({ type: 'SET_STEP', payload: 1 })} className="px-6 py-3 border-2 rounded-lg font-semibold">← Back</button>
                <button onClick={askRelationships} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold">Next →</button>
              </div>
            </div>
          )}
          
          {step === 3 && (
  <div>
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 3: Define Relationships</h2>
    <p className="text-gray-600 mb-6">Choose how your tables relate to each other. Think about which table should store the foreign key.</p>
    
    {relationships.map((rel, index) => {
      const options = getRelationshipOptions(rel.entity1, rel.entity2);
      const selectedValue = 
        rel.skipRelationship ? 'none' :
        rel.entity1HasMany && rel.entity2HasMany ? 'many-to-many' :
        !rel.entity1HasMany && rel.entity2HasMany ? 'entity1-to-entity2' :
        rel.entity1HasMany && !rel.entity2HasMany ? 'entity2-to-entity1' :
        null;
      
      return (
        <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border-2 border-indigo-200">
          <h3 className="font-bold text-xl mb-4 text-indigo-900">
            {rel.entity1} ↔ {rel.entity2}
          </h3>
          
          <div className="space-y-3">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  dispatch({ 
                    type: 'UPDATE_RELATIONSHIP', 
                    payload: { 
                      index, 
                      key: 'multiple',
                      value: option.config
                    }
                  });
                }}
                className={`w-full text-left p-4 rounded-lg border-2 font-medium transition-all ${
                  selectedValue === option.value
                    ? 'bg-green-100 border-green-500 text-green-900'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          {/* Show example */}
          {selectedValue && selectedValue !== 'none' && (
            <div className="mt-4 p-3 bg-white rounded border border-indigo-200">
              <p className="text-sm text-gray-600 font-mono">
                {selectedValue === 'entity1-to-entity2' && `${rel.entity1}.${toSnakeCase(rel.entity2)}_id → ${rel.entity2}.id`}
                {selectedValue === 'entity2-to-entity1' && `${rel.entity2}.${toSnakeCase(rel.entity1)}_id → ${rel.entity1}.id`}
                {selectedValue === 'many-to-many' && `${getBridgeTableName(rel.entity1, rel.entity2)} bridge table`}
              </p>
            </div>
          )}
        </div>
      );
    })}
    
    <div className="flex gap-4">
      <button 
        onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })} 
        className="px-6 py-3 border-2 rounded-lg font-semibold"
      >
        ← Back
      </button>
      <button 
        onClick={handleGenerateCode} 
        disabled={relationships.some(r => !r.skipRelationship && (r.entity1HasMany === null || r.entity2HasMany === null))}
        className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold disabled:bg-gray-300 hover:bg-indigo-700"
      >
        Generate Code →
      </button>
    </div>
  </div>
)}

          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Code className="w-8 h-8 text-green-600" />
                Your Backend is Ready!
              </h2>
              
              <div className="space-y-6">
                <div className="bg-gray-900 text-green-400 p-6 rounded-lg max-h-96 overflow-y-auto">
                  <div className="flex justify-between mb-4">
                    <h3 className="text-white font-bold">app/models.py</h3>
                    <button onClick={() => navigator.clipboard.writeText(generatedCode.models)} className="bg-green-600 text-white px-4 py-2 rounded text-xs">Copy</button>
                  </div>
                  <pre className="text-sm whitespace-pre-wrap">{generatedCode.models}</pre>
                </div>

                <div className="bg-gray-900 text-blue-400 p-6 rounded-lg max-h-96 overflow-y-auto">
                  <div className="flex justify-between mb-4">
                    <h3 className="text-white font-bold">app/schemas.py</h3>
                    <button onClick={() => navigator.clipboard.writeText(generatedCode.schemas)} className="bg-blue-600 text-white px-4 py-2 rounded text-xs">Copy</button>
                  </div>
                  <pre className="text-sm whitespace-pre-wrap">{generatedCode.schemas}</pre>
                </div>

                <div className="bg-gray-900 text-purple-400 p-6 rounded-lg max-h-96 overflow-y-auto">
                  <div className="flex justify-between mb-4">
                    <h3 className="text-white font-bold">app/routes.py</h3>
                    <button onClick={() => navigator.clipboard.writeText(generatedCode.routes)} className="bg-purple-600 text-white px-4 py-2 rounded text-xs">Copy</button>
                  </div>
                  <pre className="text-sm whitespace-pre-wrap">{generatedCode.routes}</pre>
                </div>
              </div>

              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mt-6">
                <h3 className="font-bold text-blue-900 mb-3">Next Steps:</h3>
                <ol className="list-decimal list-inside space-y-2 text-blue-800">
                  <li>Copy models.py into app/models.py</li>
                  <li>Copy schemas.py into app/schemas.py</li>
                  <li>Copy routes.py into app/routes.py</li>
                  <li>Run: python init_db.py</li>
                  <li>Run: python run.py</li>
                  <li>Test: curl http://localhost:5555/api/health</li>
                </ol>
              </div>
              
              <button onClick={() => dispatch({ type: 'RESET' })} className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold mt-6">Create Another Backend</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FullSchemaGenerator;