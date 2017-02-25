const models = require('./index');

module.exports = function(sequelize, DataTypes) {
    const Category = sequelize.define('Category', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(40),
            allowNull: false
        },
        // userId,
        parentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'parent_id',
            defaultValue: 0
        },
        index: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        indexes: [
            {
                fields: ['parent_id'],
                using: 'BTREE'
            },
            {
                fields: ['index'],
                using: 'BTREE'
            }
        ],
        tableName: 'category',
        underscored: true,
        classMethods: {
            countBaseLeaves: function(userId) {
                return Category.count({where: {
                    userId,
                    parentId: 0
                }});
            },
            countChildren: function(parentId) {
                return Category.count({
                    where: {
                        parentId
                    }
                });
            },
            findByUserId: function(userId) {
                return Category.findAll({
                    where: {
                        userId
                    },
                    raw: true,
                    order: [
                        ['parentId', 'ASC'],
                        ['index', 'ASC']
                    ],
                    attributes: { exclude: ['created_at', 'updated_at', 'userId'] }
                });
            }
        },
        instanceMethods: {
            update: function(parent, index) {
                this.parent = parent;
                this.index = index;
                return this.save();
            },
            moveUp: function() {
                this.index = this.index - 1;
                return this.save();
            },
            moveDown: function() {
                this.index = this.index + 1;
                return this.save();
            }
        }
    });

    return Category
}